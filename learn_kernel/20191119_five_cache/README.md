[文件缓存：常用文档应该放在触手可得的地方](https://time.geekbang.org/column/article/99108)


## 系统调用层和虚拟文件系统层
*write*和*read*的系统调用，在内核中的定义如下：
```c
SYSCALL_DEFINE3(read, unsigned int, fd, char __user *, buf, size_t, count)
{
  struct fd f = fdget_pos(fd);
......
  loff_t pos = file_pos_read(f.file);
  ret = vfs_read(f.file, buf, count, &pos);
......
}


SYSCALL_DEFINE3(write, unsigned int, fd, const char __user *, buf,
    size_t, count)
{
  struct fd f = fdget_pos(fd);
......
  loff_t pos = file_pos_read(f.file);
  ret = vfs_write(f.file, buf, count, &pos);
......
}
```
- 对于read：vfs_read->__vfs_read
- 对于wirte：vfs_write->__vfs_write
下面是*__vfs_read*和*__vfs_write*的代码：
```c

ssize_t __vfs_read(struct file *file, char __user *buf, size_t count,
       loff_t *pos)
{
  if (file->f_op->read)
    return file->f_op->read(file, buf, count, pos);
  else if (file->f_op->read_iter)
    return new_sync_read(file, buf, count, pos);
  else
    return -EINVAL;
}


ssize_t __vfs_write(struct file *file, const char __user *p, size_t count,
        loff_t *pos)
{
  if (file->f_op->write)
    return file->f_op->write(file, p, count, pos);
  else if (file->f_op->write_iter)
    return new_sync_write(file, p, count, pos);
  else
    return -EINVAL;
}
```
每个打开的文件，都又一个*struct file*结构。里面有一个*struct file_operations f_op*，用于定义文件的操作。
- __vfs_read: file_operations里面的read操作
- __vfs_write: file_operations里面的write操作


## ext4文件系统层
对于ext4文件系统来讲，内核定义了一个ext4_file_operations:
```c
const struct file_operations ext4_file_operations = {
......
  .read_iter  = ext4_file_read_iter,
  .write_iter  = ext4_file_write_iter,
......
}
```
由于ext4没有定义read和write的函数，就分别调用：
- ext4_file_read_iter -> generic_file_read_iter
- ext4_file_write_iter -> __generic_file_write_iter

```c

ssize_t
generic_file_read_iter(struct kiocb *iocb, struct iov_iter *iter)
{
......
    if (iocb->ki_flags & IOCB_DIRECT) {
......
        struct address_space *mapping = file->f_mapping;
......
        retval = mapping->a_ops->direct_IO(iocb, iter);
    }
......
    retval = generic_file_buffered_read(iocb, iter, retval);
}


ssize_t __generic_file_write_iter(struct kiocb *iocb, struct iov_iter *from)
{
......
    if (iocb->ki_flags & IOCB_DIRECT) {
......
        written = generic_file_direct_write(iocb, from);
......
    } else {
......
    written = generic_perform_write(file, from, iocb->ki_pos);
......
    }
}
```
IOCB_DIRECT就是标志是否使用缓存，如果IOCB_DIRECT设置了，就不用缓存直接在硬盘上进行读写。


我们可以根据是否使用内存作为缓存，把文件的I/O操作分为两种类型，*缓存I/O*和*直接I/O*。


对于缓存来讲，也需要文件和内存页进行关联，这就要用到*address_space*，address_space的相关操作定义在*struct address_space_operations*结构中。对于ext4文件系统来说，*address_space*的操作定义在*ext4_aops*，direct_IO对应的函数是*ext4_direct_IO*。

```c

static const struct address_space_operations ext4_aops = {
......
  .direct_IO    = ext4_direct_IO,
......
};
```
如果设置了*IOCB_DIRECT*则调用generic_file_direct_write，里面同样会调用address_space的direct_IO函数，将数据直接写入硬盘。
ext4_direct_IO最终会调用__blockdev_direct_IO->do_blockdev_direct_IO，这就跨过了缓存层，直接到了文件系统的设备驱动层。由于文件系统是块设备，所以调用的是blockdev相关的函数。
```c

/*
 * This is a library function for use by filesystem drivers.
 */
static inline ssize_t
do_blockdev_direct_IO(struct kiocb *iocb, struct inode *inode,
          struct block_device *bdev, struct iov_iter *iter,
          get_block_t get_block, dio_iodone_t end_io,
          dio_submit_t submit_io, int flags)
{......}
```

## 带缓存的写入操作
```c

ssize_t generic_perform_write(struct file *file,
        struct iov_iter *i, loff_t pos)
{
  struct address_space *mapping = file->f_mapping;
  const struct address_space_operations *a_ops = mapping->a_ops;
  do {
    struct page *page;
    unsigned long offset;  /* Offset into pagecache page */
    unsigned long bytes;  /* Bytes to write to page */
    status = a_ops->write_begin(file, mapping, pos, bytes, flags,
            &page, &fsdata);
    copied = iov_iter_copy_from_user_atomic(page, i, offset, bytes);
    flush_dcache_page(page);
    status = a_ops->write_end(file, mapping, pos, bytes, copied,
            page, fsdata);
    pos += copied;
    written += copied;


    balance_dirty_pages_ratelimited(mapping);
  } while (iov_iter_count(i));
}
```
主要分为下面四步：

### 一、对于每一页，先调用address_space的write_begin做一些准备工作
```c

static const struct address_space_operations ext4_aops = {
......
  .write_begin    = ext4_write_begin,
  .write_end    = ext4_write_end,
......
}
```
ext4 是一种日志文件系统，是为了防止突然断电的时候的数据丢失。他有下面三种模式：

- *journal*模式： 日志文件系统比非日志文件系统多了一个 Journal 区域。文件在 ext4 中分两部分存储，一部分是文件的元数据，另一部分是数据。元数据和数据的操作日志 Journal 也是分开管理的。你可以在挂载 ext4 的时候，选择 Journal 模式。这种模式在将数据写入文件系统前，必须等待元数据和数据的日志已经落盘才能发挥作用。这样性能比较差，但是最安全。

- *order模式*：不记录数据的日志，只记录元数据的日志，但是在写元数据的日志前，必须先确保数据已经落盘。这个折中，是默认模式。
- *writeback模式*：不记录数据的日志，仅记录元数据的日志，并且不保证数据比元数据先落盘。这个性能最好，但是最不安全。

在*ext4_write_begin*，做了两件事情：
- 对于*ext4_journal_start*的调用，就是做日志相关的操作。
- 调用*grab_cache_page_write_begin*，得到写入的缓存层
```c

struct page *grab_cache_page_write_begin(struct address_space *mapping,
          pgoff_t index, unsigned flags)
{
  struct page *page;
  int fgp_flags = FGP_LOCK|FGP_WRITE|FGP_CREAT;
  page = pagecache_get_page(mapping, index, fgp_flags,
      mapping_gfp_mask(mapping));
  if (page)
    wait_for_stable_page(page);
  return page;
}
```
每个打开文件的*struct file*都有一个*struct address_space*用于关联文件和内存，就是在这个结构中，用于保存所有与这个文件相关的缓存页。

我们查找的时候，往往需要根据文件中的偏移量找出相应的页面，而基数树 radix tree 这种数据结构能够快速根据一个长整型查找到其相应的对象，因而这里缓存页就放在 radix 基数树里面。
```c

struct address_space {
  struct inode    *host;    /* owner: inode, block_device */
  struct radix_tree_root  page_tree;  /* radix tree of all pages */
  spinlock_t    tree_lock;  /* and lock protecting it */
......
}
```
pagecache_get_page 就是根据 pgoff_t index 这个长整型，在这棵树里面查找缓存页，如果找不到就会创建一个缓存页。

### 二、调用 iov_iter_copy_from_user_atomic，将写入的内容从用户态拷贝到内核态的页中

先将分配好的页面调用kmap_atomic映射到内核里面的一个虚拟地址，然后将用户态的数据拷贝到内核的页面的虚拟地址中，调用kunmap_atomic删除这个映射。
```c

size_t iov_iter_copy_from_user_atomic(struct page *page,
    struct iov_iter *i, unsigned long offset, size_t bytes)
{
  char *kaddr = kmap_atomic(page), *p = kaddr + offset;
  iterate_all_kinds(i, bytes, v,
    copyin((p += v.iov_len) - v.iov_len, v.iov_base, v.iov_len),
    memcpy_from_page((p += v.bv_len) - v.bv_len, v.bv_page,
         v.bv_offset, v.bv_len),
    memcpy((p += v.iov_len) - v.iov_len, v.iov_base, v.iov_len)
  )
  kunmap_atomic(kaddr);
  return bytes;
}
```

### 三、调用ext4_wirte_end完成写操作

这里会调用ext4_journal_stop完成日志的写入，会调用block_wirte_end -> __block_commit_write -> mark_buffer_dirty将修改过的缓存标记为脏页。这里并没有真正的写入，只是做了层标记，标记为脏页。

### 四、调用 balance_dirty_pages_ratelimited，看脏页是否太多，需要写回硬盘。
```c

/**
 * balance_dirty_pages_ratelimited - balance dirty memory state
 * @mapping: address_space which was dirtied
 *
 * Processes which are dirtying memory should call in here once for each page
 * which was newly dirtied.  The function will periodically check the system's
 * dirty state and will initiate writeback if needed.
  */
void balance_dirty_pages_ratelimited(struct address_space *mapping)
{
  struct inode *inode = mapping->host;
  struct backing_dev_info *bdi = inode_to_bdi(inode);
  struct bdi_writeback *wb = NULL;
  int ratelimit;
......
  if (unlikely(current->nr_dirtied >= ratelimit))
    balance_dirty_pages(mapping, wb, current->nr_dirtied);
......
}
```
在*balance_dirty_pages_ratelimited*中，如果发现脏页的数目超过了规定的数目，就调用balance_dirty_pages -> wb_start_background_writeback启动一个线程开始回写：
```c

void wb_start_background_writeback(struct bdi_writeback *wb)
{
  /*
   * We just wake up the flusher thread. It will perform background
   * writeback as soon as there is no other work to do.
   */
  wb_wakeup(wb);
}


static void wb_wakeup(struct bdi_writeback *wb)
{
  spin_lock_bh(&wb->work_lock);
  if (test_bit(WB_registered, &wb->state))
    mod_delayed_work(bdi_wq, &wb->dwork, 0);
  spin_unlock_bh(&wb->work_lock);
}


  (_tflags) | TIMER_IRQSAFE);    \
  } while (0)


/* bdi_wq serves all asynchronous writeback tasks */
struct workqueue_struct *bdi_wq;


/**
 * mod_delayed_work - modify delay of or queue a delayed work
 * @wq: workqueue to use
 * @dwork: work to queue
 * @delay: number of jiffies to wait before queueing
 *
 * mod_delayed_work_on() on local CPU.
 */
static inline bool mod_delayed_work(struct workqueue_struct *wq,
            struct delayed_work *dwork,
            unsigned long delay)
....
```
bdi_wq是一个全局变量，所有的回写都会挂在这个队列上。mod_delayed_work函数负责将一个会写任务*bdi_writeback*挂在这个队列上。bdi_writeback有个成员变量*struct deplayed_work dwork*，bdi_writeback就是以deplayed_work的身份挂在队列上，并且把delay设置为0，就是马上执行。

bdi的意思是*backing device info*用于描述后端存储信息。每个块设备上都会有这样一个结构，并且在初始化块设备的时候调用dbi_init初始化这个结构，在初始化bdi的时候，也会调用wb_init初始化bdi_writeback。
```c

static int wb_init(struct bdi_writeback *wb, struct backing_dev_info *bdi,
       int blkcg_id, gfp_t gfp)
{
  wb->bdi = bdi;
  wb->last_old_flush = jiffies;
  INIT_LIST_HEAD(&wb->b_dirty);
  INIT_LIST_HEAD(&wb->b_io);
  INIT_LIST_HEAD(&wb->b_more_io);
  INIT_LIST_HEAD(&wb->b_dirty_time);
  wb->bw_time_stamp = jiffies;
  wb->balanced_dirty_ratelimit = INIT_BW;
  wb->dirty_ratelimit = INIT_BW;
  wb->write_bandwidth = INIT_BW;
  wb->avg_write_bandwidth = INIT_BW;
  spin_lock_init(&wb->work_lock);
  INIT_LIST_HEAD(&wb->work_list);
  INIT_DELAYED_WORK(&wb->dwork, wb_workfn);
  wb->dirty_sleep = jiffies;
......
}


#define __INIT_DELAYED_WORK(_work, _func, _tflags)      \
  do {                \
    INIT_WORK(&(_work)->work, (_func));      \
    __setup_timer(&(_work)->timer, delayed_work_timer_fn,  \
            (unsigned long)(_work),      \
```
__INIT_DELAYED_WORK是初始化一个timer，到时候就执行delayed_work_timer_fn。
接下来的调用链：wb_workfn->wb_do_writeback->wb_writeback->writeback_sb_inodes->__writeback_single_inode->do_writepages，写入页面到硬盘。

在调用 write 的最后，当发现缓存的数据太多的时候，会触发回写，这仅仅是回写的一种场景。另外还有几种场景也会触发回写：
- 用户主动调用 sync，将缓存刷到硬盘上去，最终会调用 wakeup_flusher_threads，同步脏页；
- 当内存十分紧张，以至于无法分配页面的时候，会调用 free_more_memory，最终会调用 wakeup_flusher_threads，释放脏页；
- 脏页已经更新了较长时间，时间上超过了 timer，需要及时回写，保持内存和磁盘上数据一致性。



## 带缓存的读操作

```c

static ssize_t generic_file_buffered_read(struct kiocb *iocb,
    struct iov_iter *iter, ssize_t written)
{
  struct file *filp = iocb->ki_filp;
  struct address_space *mapping = filp->f_mapping;
  struct inode *inode = mapping->host;
  for (;;) {
    struct page *page;
    pgoff_t end_index;
    loff_t isize;
    page = find_get_page(mapping, index);
    if (!page) {
      if (iocb->ki_flags & IOCB_NOWAIT)
        goto would_block;
      page_cache_sync_readahead(mapping,
          ra, filp,
          index, last_index - index);
      page = find_get_page(mapping, index);
      if (unlikely(page == NULL))
        goto no_cached_page;
    }
    if (PageReadahead(page)) {
      page_cache_async_readahead(mapping,
          ra, filp, page,
          index, last_index - index);
    }
    /*
     * Ok, we have the page, and it's up-to-date, so
     * now we can copy it to user space...
     */
    ret = copy_page_to_iter(page, offset, nr, iter);
    }
}
```

1. find_get_page: 先找page cache里面是否有缓存，如果没有进行下一步
2. page_cache_sync_readahead: 读取一页并且预读，
3. 预读完了，在找一把find_get_page缓存页
4. 如果第一次找缓存页就找到了，我们还是要判断，是不是应该继续预读；如果需要，就调用 page_cache_async_readahead 发起一个异步预读。
5. copy_page_to_iter: 会将内容从缓存页拷贝到用户内存空间


## 总结

![image](https://user-images.githubusercontent.com/12036324/69117592-24c8ce00-0acb-11ea-899c-52ee0b7298ba.png)

## 问题

你知道如何查询和清除文件系统缓存吗？

通过free查看。

- [How to Clear RAM Memory Cache, Buffer and Swap Space on Linux](https://www.tecmint.com/clear-ram-memory-cache-buffer-and-swap-space-on-linux/)
