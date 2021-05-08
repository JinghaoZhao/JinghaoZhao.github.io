var canvas = document.getElementById("mycanvas").getContext("2d") ;

canvas.shadowOffsetX = 100;
canvas.shadowOffsetY = 100;
canvas.shadowBlur = 10;
canvas.shadowColor = 'blue';
canvas.fillStyle = 'blue';
canvas.strokeStyle = '#09c';
canvas.lineWidth = 5;
canvas.fillRect(0,0,100,100);
canvas.clearRect(25,25,50,50);
canvas.strokeRect(25,25,50,50);


//$("#a").show().animate({left:200px}) ;
$("#a").show().slideDown("slow");


var cars = new Array['vw','wolve'];