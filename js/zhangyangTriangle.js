$(function () {
    var canvasHeight = window.innerHeight, canvasWidth = window.innerWidth, nodesPerLine = 4,
        lines = 4, threshold = 140, maxDrift = 140, maxDim = 30, baseColor = "#065688", ratio = 10;
    var canvas = $(document).find("#kinetic-bg>canvas"), ctx;
    try {
        ctx = canvas[0].getContext("2d");
    } catch (e) {
        // IE8 fallback
        var canvasWrapper = $(document).find("#kinetic-bg");
        canvasWrapper.css("width", (document.documentElement.clientWidth || document.body.clientWidth) + "px")
            .css("height", (document.documentElement.clientHeight || document.body.clientHeight) + "px")
            .css("background-color", baseColor);
    }
    var colors = ['#8B0000', '#065688'];
    resizeCanvas();
    var nodeRows = [];

    function resizeCanvas() {
        canvas[0].width = window.innerWidth;
        canvas[0].height = window.innerHeight;
    }

    function Node(row, idx) {
        this.x = canvasWidth / (nodesPerLine - 1) * idx
            - Math.random() * threshold + threshold / 2;
        this.y = canvasHeight / (lines - 1) * row
            - Math.random() * threshold + threshold / 2;
        // this.rgba = colors[Math.round(Math.random() * 4)];
        // this.r = 1;
        this.v = Math.random() * ratio - ratio / 2;//运动速度
        this.dir = Math.round(Math.random()) * 2 - 1;//运动方向，取值+-1
        this.dim = Math.random() * maxDim;//颜色明暗变化率
        this.dimdir = Math.round(Math.random()) * 2 - 1;//颜色明暗变化方向,+-1
        this.dimv = this.v * maxDim / maxDrift * 2;
        this.oc = colors[Math.round(Math.random())];
        this.c = shadeColor(this.oc, this.dim);//origin color
    }

    /**
     * http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
     */
    function shadeColor(color, percent) {
        var num = parseInt(color.slice(1), 16), amt = Math.round(2.55 * percent), R = (num >> 16) + amt, G = (num >> 8 & 0x00FF) + amt, B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    function draw() {
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        ctx.globalCompositeOperation = 'source-cover';
        for (var i = 0; i < lines; i++) {
            for (var j = 0; j < nodesPerLine; j++) {
                var temp = nodeRows[i][j];
                /*ctx.fillStyle = temp.rgba;
                 ctx.strokeStyle = temp.rgba;

                 ctx.beginPath();
                 ctx.arc(temp.x, temp.y, temp.r, 0, Math.PI * 2, true);
                 ctx.fill();
                 ctx.closePath();

                 ctx.beginPath();
                 ctx.arc(temp.x, temp.y, temp.r + 5, 0, Math.PI * 2, true);
                 ctx.stroke();
                 ctx.closePath();*/

                temp.x += temp.vx * temp.dir;
                temp.y += temp.vy * temp.dir;
                if ((temp.dim <= maxDim) && (temp.dim >= -maxDim / 2)) {
                    temp.dim += temp.dimv * temp.dimdir;
                } else {
                    temp.dimdir = -temp.dimdir;
                    temp.dim += temp.dimv * temp.dimdir;
                }
                temp.c = shadeColor(temp.oc, temp.dim);

                if (Math.abs(temp.x - temp.ox) >= maxDrift) {
                    temp.dir = -temp.dir;
                }
            }
        }
        for (i = 0; i < lines - 1; i++) {
            for (j = 0; j < nodesPerLine - 1; j++) {
                temp = nodeRows[i][j];
                var temp1 = nodeRows[i][j + 1];
                var temp2 = nodeRows[i + 1][j + 1];

                // ctx.strokeStyle = 'black';
                ctx.fillStyle = temp.c;
                ctx.beginPath();
                ctx.moveTo(temp.x, temp.y);
                ctx.lineTo(temp1.x, temp1.y);
                ctx.lineTo(temp2.x, temp2.y);
                ctx.lineTo(temp.x, temp.y);
                // ctx.stroke();
                ctx.closePath();
                ctx.fill();
            }
        }
        for (i = 0; i < lines - 1; i++) {
            for (j = 0; j < nodesPerLine - 1; j++) {
                temp = nodeRows[i][j];
                temp1 = nodeRows[i + 1][j];
                temp2 = nodeRows[i + 1][j + 1];
                var temp3 = nodeRows[i][j + 1];
                // ctx.strokeStyle = 'black';
                ctx.fillStyle = temp3.c;
                ctx.beginPath();
                ctx.moveTo(temp.x, temp.y);
                ctx.lineTo(temp1.x, temp1.y);
                ctx.lineTo(temp2.x, temp2.y);
                ctx.lineTo(temp.x, temp.y);
                // ctx.stroke();
                ctx.closePath();
                ctx.fill();
            }
        }

    }

    window.requestAnimFrame = (function () {
        return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            };
    })();

    (function init() {
        canvas.css('background-color', baseColor);
        if (window.addEventListener) {
            window.addEventListener('resize', resizeCanvas, false);
        } else {
            // IE 8 fallback
            window.attachEvent('resize', resizeCanvas);
        }
        for (var i = 0; i < lines; i++) {
            nodeRows.push([]);
            for (var j = 0; j < nodesPerLine; j++) {
                nodeRows[i].push(new Node(i, j));
            }
        }
        for (i = 0; i < lines; i++) {
            for (j = 0; j < nodesPerLine; j++) {
                var temp = nodeRows[i][j];
                var temp2 = nodeRows[i][++j];
                var dx = temp2.x - temp.x;
                var dy = temp2.y - temp.y;
                var c = Math.cos(Math.atan(dy / dx));
                var s = Math.sin(Math.atan(dy / dx));
                temp.vx = temp.v * c;
                temp.vy = temp.v * s;
                temp.ox = temp.x;
                temp.oy = temp.y;
                temp2.vx = temp2.v * c;
                temp2.vy = temp2.v * s;
                temp2.ox = temp2.x;
                temp2.oy = temp2.y;
            }
        }
    })();

    (function loop() {
        draw();
        requestAnimFrame(loop);
    })();
});