var colorTypes = ['#ffc1fc', '#beeb74', '#e0d4ff', '#ffb290', '#ffbd71', '#ded75f', '#9cd8fc', '#f5bc7b', '#5eebc7', '#d1beda', '#52eaf9', '#9ed5c2', '#c9d188', '#91d289', '#ffbccc', '#ffac9e', '#ffaabb', '#8df8a0', '#ffce63'];
var fields = ['Psychology', 'Political Science', 'Mathematics', 'Environmental Science', 'Computer Science', 'Medicine', 'Biology', 'History', 'Physics', 'Geology', 'Engineering', 'Philosophy', 'Art', 'Sociology', 'Business', 'Economics', 'Chemistry', 'Materials Science', 'Geography'];
var widthRef = 600;
var heightRef = 600;

function change2D() {
    Plotly.d3.csv('data/data.csv',function(err,rows){

        var fieldsX = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        var fieldsY = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        var fieldsZ = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
        var fieldsXTmp = 0;
        var fieldsYTmp = 0;

        function unpack(rows,key) {
            return rows.map(function(row){ return row[key]; });
        }

        var i = 0;
        var m = 0; // 循环变量

        var data = colorTypes.map(function(colorType){
            var rowsFiltered = rows.filter(function(row){
                return row.color === colorType;
            });

            fieldsXTmp = unpack(rowsFiltered,'x');
            fieldsYTmp = unpack(rowsFiltered,'y');
            for(m=0;m<fieldsXTmp.length;m++) {
                fieldsX[i] += parseFloat(fieldsXTmp[m]);
                fieldsY[i] += parseFloat(fieldsYTmp[m]);
            }
            fieldsX[i] /= parseFloat(fieldsXTmp.length);
            fieldsY[i] /= parseFloat(fieldsXTmp.length);
            return {
                mode : 'markers' ,
                name : fields[i++] ,
                x : unpack(rowsFiltered,'x'),
                y : unpack(rowsFiltered,'y'),
                //z : unpack(rowsFiltered,'size').map(function(size){ return Math.log(size/4)*100;}),
                z : unpack(rowsFiltered,'size').map(function(){ return 0;}),
                text : unpack(rowsFiltered,'text'),
                topicID : unpack(rowsFiltered,'topicID'),
                hoverinfo: 'text',
                //visible:'legendonly',
                line:{
                    color: 'rgba(50, 50, 50, 0.4)',
                    width:3
                },
                marker:{
                    size : unpack(rowsFiltered,'size').map(function(s){return s*0.5}),
                    color : unpack(rowsFiltered,'color')
                },
                type: 'scatter3d',
                contour:{
                    show:false
                },
                showlegend:false
            };
        });

        var traceField = {
            mode:'text',
            name:'Fields',
            x:fieldsX,
            y:fieldsY,
            z:fieldsZ,
            text:fields,
            hoverinfo: 'none',
            textfont:{
                size:15
            },
            visible:true,
            type: 'scatter3d',
            showlegend:false
        };

        data.push(traceField);

        var layout = {
            //title : 'Topic Map',
            //titlefont:{
            //    size:30,
            //    family:"Courier New"
            //},
            height:heightRef,
            width:widthRef,
            hovermode: 'closest',
            legend:{
                font:{
                    color:'rgba(0, 0, 0, 1)',
                    size:15
                }
            },
            scene: {
                dragmode:'zoom',
                aspectratio: {
                    x: 1,
                    y: 1,
                    z: 1
                },
                camera: {
                    center: {
                        x: 0,
                        y: 0,
                        z: 0
                    },
                    eye: {
                        x: 0,
                        y: 0,
                        z: -1.18
                    },
                    up: {
                        x: 0,
                        y: -10,
                        z: 0
                    }
                },
                xaxis: {
                    type:'linear',
                    title:'',
                    showticklabels: false,
                    showgrid: false,
                    zeroline: false,
                    showline:false,
                    showspikes:false
                },
                yaxis: {
                    type:'linear',
                    title:'',
                    showticklabels: false,
                    showgrid: false,
                    zeroline: false,
                    showline:false,
                    showspikes:false
                },
                zaxis: {
                    type:'linear',
                    title:'Heat Level',
                    titlefont:{
                        size:20,
                        color:'red'
                    },
                    showticklabels: false,
                    showgrid: false,
                    zeroline: false,
                    showline:false,
                    showspikes:false
                }
            }
        };

        Plotly.newPlot('topicmap', data, layout);

    });

}

function changeReal2d (){

    Plotly.d3.csv('data/data.csv',function(err,rows){

        var fieldsX = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        var fieldsY = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        var fieldsXTmp = 0;
        var fieldsYTmp = 0;

        function unpack(rows,key) {
            return rows.map(function(row){ return row[key]; });
        }

        var i = 0;
        var m = 0; // 循环变量

        var data = colorTypes.map(function(colorType){
            var rowsFiltered = rows.filter(function(row){
                return row.color === colorType;
            });

            fieldsXTmp = unpack(rowsFiltered,'x');
            fieldsYTmp = unpack(rowsFiltered,'y');
            for(m=0;m<fieldsXTmp.length;m++) {
                fieldsX[i] += parseFloat(fieldsXTmp[m]);
                fieldsY[i] += parseFloat(fieldsYTmp[m]);
            }
            fieldsX[i] /= parseFloat(fieldsXTmp.length);
            fieldsY[i] /= parseFloat(fieldsXTmp.length);
            return {
                mode : 'markers' ,
                name : fields[i++] ,
                x : unpack(rowsFiltered,'x'),
                y : unpack(rowsFiltered,'y'),
                text : unpack(rowsFiltered,'text'),
                hoverinfo: 'text',
                //visible:'legendonly',
                line:{
                    color: 'rgba(50, 50, 50, 0.6)',
                    width:3
                },
                marker:{
                    size : unpack(rowsFiltered,'size').map(function(s){return s*0.7}),
                    color : unpack(rowsFiltered,'color')
                },
                showlegend:false
            };
        });


        var traceField = {
            mode:'text',
            name:'Fields',
            x:fieldsX,
            y:fieldsY,
            text:fields,
            textfont:{
                size:10
            },
            showlegend:false
        };

        data.push(traceField);

        var layout = {
            //title : 'Topic Map',
            //titlefont:{
            //    size:40,
            //    family:"Courier New"
            //},
            height:600,
            width:600,
            hovermode: 'closest',
            legend:{
                font:{
                    color:'rgba(50, 50, 50, 1)',
                    size:15
                }
            },
            xaxis: {
                showticklabels: false,
                //autotick: false,
                showgrid: false,
                zeroline: false
            },
            yaxis: {
                showticklabels: false,
                //autotick: false,
                showgrid: false,
                zeroline: false
            }
        };

        Plotly.plot('topicmap', data, layout);

    });
}

function color3d(){
    Plotly.d3.csv('data/color.csv', function(err, rows){
        function unpack(rows, key) {
            return rows.map(function(row)
            { return row[key]; });}

        xxx = unpack(rows, 'x');
        yyy = unpack(rows, 'y');
        zzz = unpack(rows, 'z');
        ttt = unpack(rows, 'text');
        ccc = unpack(rows, 'color');

        var trace1 = {
            x:unpack(rows, 'x'),
            y: unpack(rows, 'y'),
            z: unpack(rows, 'z'),
            text:unpack(rows, 'text'),
            mode: 'markers',
            marker: {
                size: 2.5,
                color: unpack(rows, 'color'),
                opacity: 0.7
            },
            type: 'scatter3d'
        };
        var data = [trace1];
        var layout = {
            //title:'RGB',
            //titlefont:{
            //    size:40,
            //    family:"Courier New",
            //    width:5
            //},
            height:600,
            width:600,
            showlegend:false,
            scene: {
                xaxis: {
                    type:'linear',
                    title: 'Red'
                },
                yaxis: {
                    type:'linear',
                    title: 'Green'
                },
                zaxis: {
                    type:'linear',
                    title:'Blue'
                }
            }
        };
        Plotly.newPlot('colorcanvas', data, layout);
    });
}

////////////////Default//////////////////////////

changeReal2d();
color3d();