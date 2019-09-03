

[Linux 文件与目录管理](http://cn.linux.vbird.org/linux_basic/0220filemanager_7.php)

## PATH 这个环境变量的意义？
查找命令的指定路径，比如ls，就去PATH中的每一项去拼（比如：/bin/ls）


## umask 有什么用处与优点？
root账户的umask是022，普通用户的umask是002


用处：用户新建文件或者目录的时候的默认权限，应该减去对应的umask的值。(文件的默认权限是666，目录的权限是777)
优点：保护好权限

## 当一个使用者的 umask 分别为 033 与 044 他所创建的文件与目录的权限为何？

033:
- 文件：644
- 目录：744
044:
- 文件：622
- 目录：733


## 什么是 SUID 和SGID ？
- SUID：比如（-rwsr-xr-x） 用户在执行过程中获得拥有者的权限
- SGID：比如（-rwx-rwsr-x）用户在执行过程中获得用户组的权限




## 当我要查询 /usr/bin/passwd 这个文件的一些属性时(1)传统权限；(2)文件类型与(3)文件的隐藏属性，可以使用什么命令来查询？

ll /usr/bin/passwd; lsattr /usr/bin/passwd

## 尝试用 find 找出目前 linux 系统中，所有具有 SUID 的文件有哪些？
find / -perm 4000

## 找出 /etc 底下，文件大小介於 50K 到 60K 之间的文件，并且将权限完整的列出 (ls -l)：

find /etc/ -size +50k -size -60k


## 找出 /etc 底下，文件容量大於 50K 且文件所属人不是 root 的档名，且将权限完整的列出 (ls -l)；

find /etc/ -size +50k -size -60k !  -user root  -exec ls -l {} \;

## 找出 /etc 底下，容量大於 1500K 以及容量等於 0 的文件：

find /etc/ -size +1500k -o -size 0
