define(function (require,exports,module) {
    function Pagination(current, total, show, format) {
        this.current = current;
        this.total = total;
        this.show = show;
        // 1. 根据显示数量算出正常情况当前页的左右各有几个
        var region = Math.floor(show / 2);
        // 2. 计算出当前界面上的起始值
        var begin = current - region; // 可能小于 1
        begin = begin < 1 ? 1 : begin;
        var end = begin + show; // end必须小于total
        if (end > total) {
            end = total + 1;
            begin = end - show;
            begin = begin < 1 ? 1 : begin;
        }
        this.begin = begin;
        this.end = end;
    };
    Pagination.prototype.render = function(containers) {
        // 获取分页展示容器
        // p.render('.pgfds');
        if (typeof containers === 'string') {
            containers = document.querySelectorAll(containers);
        }
        if (containers.length === undefined) {
            // dom对象
            containers = [containers];
        }
        for (var c = 0; c < containers.length; c++) {
            var container = containers[c];
            // 先append上一页
            var prevElement = document.createElement('li');
            prevElement.innerHTML = '<a href="?page=' + (this.current - 1) + '" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a>';
            if (this.current == 1) {
                console.log(this.current);
                prevElement.classList.add('disabled');
            }
            container.appendChild(prevElement);
            for (var i = this.begin; i < this.end; i++) {
                var liElement = document.createElement('li');
                liElement.innerHTML = '<a href="?page=' + i + '">' + i + '</a>';
                if (i == this.current) {
                    // 此时是当前页
                    liElement.classList.add('active');
                }
                container.appendChild(liElement);
            }
            var nextElement = document.createElement('li');
            nextElement.innerHTML = '<a href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>';
            if (this.current == this.total) {
                nextElement.classList.add('disabled');
            }
            container.appendChild(nextElement);
        }
    };

    module.exports = Pagination;
})
