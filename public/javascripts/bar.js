	window.onload = function () {

		// dataPoints
		var dataPoints1 = [];
		var dataPoints2 = [];

		var chart = new CanvasJS.Chart("chartContainer",{
			zoomEnabled: true,
			title: {
				text: "Lizard Temperature and Humidity"		
			},
			toolTip: {
				shared: true
				
			},
			legend: {
				verticalAlign: "top",
				horizontalAlign: "center",
                                fontSize: 14,
				fontWeight: "bold",
				fontFamily: "calibri",
				fontColor: "dimGrey"
			},
			axisX: {
				title: "chart updates every minute"
			},
			axisY:{
				prefix: '',
				includeZero: false
			}, 
			data: [{ 
				// dataSeries1
				type: "line",
				xValueType: "dateTime",
				showInLegend: true,
				name: "Humidity",
				dataPoints: dataPoints1
			},
			{				
				// dataSeries2
				type: "line",
				xValueType: "dateTime",
				showInLegend: true,
				name: "Temperature" ,
				dataPoints: dataPoints2
			}],
          legend:{
            cursor:"pointer",
            itemclick : function(e) {
              if (typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                e.dataSeries.visible = false;
              }
              else {
                e.dataSeries.visible = true;
              }
              chart.render();
            }
          }
		});



		var updateInterval = 60000;
		// initial value
		var yValue1 = 640; 
		var yValue2 = 604;

		var time = new Date;
		// starting at 9.30 am

		var updateChart = function () {
			// count is number of times loop runs to generate random dataPoints. 
			$.get(
			    "/api/conditions/",
		    	function(data) {
 				
		 				// add interval duration to time				
					time.setTime(time.getTime() + updateInterval);
					//to F 
					data.temperature = data.temperature * 1.8 + 32;
					
					// pushing the new values
					dataPoints1.push({
						x: time.getTime(),
						y: Math.round(data.humidity)
					});
					dataPoints2.push({
						x: time.getTime(),
						y: Math.round(data.temperature)
					});
		 
		 			// updating legend text with  updated with y Value 
		 			chart.options.data[0].legendText = " Humidity: " + Math.round(data.humidity) + "%";
		 			chart.options.data[1].legendText = " Temperature: " + Math.round(data.temperature) + "F"; 

		 			chart.render();

		 		});
 
 		};
 		var updateChartFromHistory = function(count){
			$.get(
			    "/api/hist/"+count,
		    	function(data) {
 					for(var i = 0; i < data.length; i++){
		 				// add interval duration to time				

					time.setTime(new Date(data[i].time));
					//to F 
					data[i].temperature = data[i].temperature * 1.8 + 32;
					
					// pushing the new values
					dataPoints1.push({
						x: time.getTime(),
						y: Math.round(data[i].humidity)
					});
					dataPoints2.push({
						x: time.getTime(),
						y: Math.round(data[i].temperature)
					});
		 			
		 			// updating legend text with  updated with y Value 
		 			chart.options.data[0].legendText = " Humidity: " + Math.round(data[i].humidity) + "%";
		 			chart.options.data[1].legendText = " Temperature: " + Math.round(data[i].temperature) + "F"; 
 					
 					}
		 			chart.render();

		 		});
 		};
 
 		// generates first set of dataPoints 
 		updateChartFromHistory(20);
 		//updateChartFromHistory(100);	
 		 
 		// update chart after specified interval 
 		setInterval(function(){updateChart()}, updateInterval);
 	}