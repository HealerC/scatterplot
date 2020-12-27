document.addEventListener("DOMContentLoaded", function() {
	/*
     * The dataset used is the one given by Freecodecamp and it contains
     * the Data for fastest cyclists up a certain mountain (Alpe d'Huez) and doping allegations (if any).
	 */
	fetch("./cyclist-data.json")
	    .then(result => result.json())
	    .then(data => {
	    	const dataset = data;	// An array of objects containing cyclist details
	    	renderData(dataset);
	    });
});

/**
* @method renderData
* @param {Object - Array} data The dataset used in the program. An array where each entry has the 
* data for each of the cyclists
* This method renders the scatterplot
*/
function renderData(data) {
	const dopeColor = "#137B80";
	const noDopeColor = "#E6842A";
	const svg = d3.select("svg");

	let width = svg.style("width");		// The width was set using CSS and is therefore
										// a string with corresponding unit
	width = +width.substring(0, width.indexOf("px"));	// Remove the unit and convert 
														// to a unitless number (how SVG likes)


	let height = svg.style("height")	// Same as width
	height = +height.substring(0, height.indexOf("px"));

	const margin = { left: 60, top: 60, right: 60, bottom: 60 }; // The space around the four sides of the svg
	
	/* The scales maps the values of the dataset to the dimensions of the SVG.
	   Year is on the x axis and while the fastest time of the cyclist is on the y axis */

	const xScale = d3.scaleLinear()
					 .domain([d3.min(data, d => d.Year-1), d3.max(data, d => d.Year+1)])	// The years  
					 .range([margin.left, width - margin.right])	// There should be space around
	
	const minTime = new Date("2000-05-27T00:36:00");
	const maxTime = new Date("2000-05-27T00:40:00");
	const yScale = d3.scaleTime()		// Scale that maps time to dimensions
					 .domain([minTime, maxTime])	// The min and max extent of time
					 .range([margin.top, height - margin.bottom]);	// The lower time should be higher in the graph
	const DATE = "2000-05-27T00:"		// Constant string format to append the time to
	
	let datasetFreq = [];
	const dots = svg.selectAll("circle")
	   				.data(data)
					.enter()
					.append("circle")
					.attr("class", "dot")
					.attr("data-xvalue", (d) => d.Year)
					.attr("data-yvalue", (d) => new Date(DATE + d.Time))	// Has to be formatted like the time above
					.attr("cx", (d) => xScale(d.Year) )
					.attr("cy", (d) => yScale(new Date(DATE + d.Time)) )		
					.attr("r", function(d) {
						let name = d.Name;
						let newCoords = d3.select(this).attr("cx") + "," + d3.select(this).attr("cy");
						let doping = d.Doping ? true : false;
						let index = datasetFreq.findIndex((value) => value.name === name);
						if (index >= 0) {
							datasetFreq[index].coords.push(newCoords);
						} else {
							datasetFreq.push({name: name, coords: [newCoords], isDoping: doping});
						}
						return 7;
					});
	datasetFreq = datasetFreq.filter((value) => value.coords.length > 1)
	console.log(datasetFreq);
	/* Give the dots different style depending on whether the particular data was involved in doping or not */
	dots.attr("class", (d) => {
		return d.Doping ? "dope" : "no-dope";
	});
	/* The group elements that contain the axes returned from the function that 
	rendered the axes and used subsequently to render the x and y axes labels */
	const { xg, yg } = renderAxis(svg, xScale, yScale, { height, margin });
	renderAxisLabel(xg, yg, { width, height });		// The x and y axes labels
	
	renderTooltip(dots);				// The tooltip that shows on mouseover the dots
	const line = drawLineRelationships(svg, datasetFreq);
	console.log(line);
	const legend = renderLegend( svg, { text: ["Doping", "Allegations"], color: dopeColor}, 
				  { text: ["No Doping", "Allegations"], color: noDopeColor} );

	let lineIsShowing = false;
	legend.on("click", () => {
		if (lineIsShowing) {
			line.style("visibility", "hidden");
			legend.node().classList.remove("line-on");
		} else {
			line.style("visibility", "visible");
			legend.node().classList.add("line-on");
		}
		lineIsShowing = !lineIsShowing;
	})
}

/**
 *  @method renderAxis
 *  @param {Object} svg svg d3 selection that contains the scatterplot
 *  @param {Object} xScale maps the dataset to the svg dimensions for x axis
 *  @param {Object} yScale maps the dataset for the y axis
 *  @param {Object} dimensions contains the height and margins used in the program
 *  @return {Object} Returns the group elements for the x and y axes
 */
function renderAxis(svg, xScale, yScale, dimensions) {
	const { height, margin } = dimensions;

	const xAxis = d3.axisBottom(xScale)
					// The tick values should be numbers di1 by 5
					//.tickValues(getTickValues(xScale))
					// The tick should only show the year instead of the full date
					.tickFormat(d => String(d));
	const timeFormat = d3.timeFormat("%M:%S");
	const yAxis = d3.axisLeft(yScale)
					.tickFormat(d => timeFormat(d));

	const xg = svg.append("g")
				  .attr("id", "x-axis")
	   			  .attr("transform", `translate(0, ${height-margin.bottom})`)
	   			  .call(xAxis);

	const yg = svg.append("g")
				  .attr("id", "y-axis")
	   			  .attr("transform", `translate(${margin.top}, 0)`)
	              .call(yAxis);

	return { xg, yg };	// Return the group elements made when making the axes to use
						// them to make the axes labels subsequently.
}

/**
 * @method renderAxisLabel renders the axes labels for the x and y axis
 * @param {Object} xg The group element created for the x axis
 * @param {Object} yg The group element created for the y axis
 * @param {Object} dimensions The dimensions (width and height) needed 
 * to compute the labels 
 */
function renderAxisLabel(xg, yg, dimensions) {
	const { width, height } = dimensions;
	
	xg.append("text")
	  .attr("class", "label")
	  .text("Year")
	  // The x axis label should be at the centered horizontally and 
	  // should go under the axis
	  .attr("x", width/2)
	  .attr("y", 40);

	yg.append("text")
	  .attr("class", "label")
	  .text("Time (minutes)")
	  // The parameters were just chosen to fit in. I honestly have not mastered
	  // rotation in svg but it just works
	  .attr("x", -(height-350)/2)
	  .attr("y", -50)
	  .attr("transform", `rotate(-90)`);
}

/*
* @method renderTooltip shows a tooltip when the user hovers on any of the dots
* the tooltip shows the quarter of the year and the GDP of that quarter
* @param {Object} dots each bar of the bar chart (a rect d3 selection)
*/
function renderTooltip(dots) {
	/* The tooltip is a div element that can be positioned anywhere in the document
	(due to the absolute positioning [css]) and is 0 when the user does not 
	hover over it. */
	const tooltip = d3.select("body")
					   .append("div")
					   .attr("id", "tooltip")
					   .style("opacity", "0")
					   .on("mouseover", function() {
					   		//if (d3.select(this).style("opacity") > 0) {
					   			//console.log("yeah");
					   			d3.select(this).style("opacity", 1);
					   			d3.select(this).style("box-shadow", "0 4px 8px 0 "
					   			  + "rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)");
					   		//}
					   })
					   .on("mouseleave", function() {
					   		d3.select(this).style("box-shadow", "none")
					   		d3.select(this).style("opacity", 0);
					   		d3.select(this).style("visibility", "hidden");
					   })
	// Show the tooltip with the data on mouse over
	dots.on("mouseover", function(event, d) {	
		tooltip.style("visibility", "visible").style("opacity", "1")
		       .html(getDisplay(d))
		       .attr("data-date", null)			// required in FCC tests
		       // Displacement on the x axis should be some distance from the mouse
		       .style("left", (event.pageX) + "px")
		       // Displacement on the y axis should be constant (60%) of the screen height
	      	   .style("top", (event.pageY) + "px")
	      	   .style("background-color", () => {
	      	   		return d.Doping ? "rgba(188, 223, 228, 0.8)" : 
	      	   						  "rgba(250, 226, 189, 0.8)";
	      	   }); 
	})
	.on("mouseout", () => {
		// Hide when the mouse moves out of the dots
		tooltip.style("opacity", "0");
	})

	/*
 	* @method getDisplay gets and formats the data that will be displayed
 	* when the user's mouse is over the bar
 	* @param {string} d The data that will be represented/shown in the tooltip
 	* @return {string} output a string with the correct format in html
	*/
	function getDisplay(d) {
		let output = "";
		if (d.URL === "") {
			output = `${d.Name}: ${d.Nationality}<br />
					  Year: ${d.Year}, Time: ${d.Time}
					  <p></p>`;
		} else {
			output = `${d.Name}: ${d.Nationality}<br />
					  Year: ${d.Year}, Time: ${d.Time}
					  <p><a href="${d.URL}" target="_blank" class="more-info">${d.Doping}</a></p>`;
		}
		return output;
	}
}
function drawLineRelationships(svg, data) {
	const line = svg.insert("g", ":first-child")
	   				.selectAll("polyline")
				    .data(data)
				    .enter()
				    .append("polyline")
				    .attr("points", (d) => {
				   		return d.coords.join(" ");;	
				     })
				    .attr("class", (d) => {
				   		return d.isDoping ? "dope" : "no-dope"
				     })
				    .attr("fill", "none")
					.style("visibility", "hidden");
	return renderLineTooltip(line);
}
function renderLineTooltip(line) {
	const lineTooltip = d3.select("body")
					      .append("div")
					      .attr("id", "line-tooltip")
					      .style("opacity", "0");
	
	// Show the tooltip with the data on mouse over
	line.on("mouseover", function(event, d) {
		console.log(d.name);	
		lineTooltip.style("opacity", "1")
		       .html(d.name)
		       .style("left", (event.pageX) + "px")
		       // Displacement on the y axis should be constant (60%) of the screen height
	      	   .style("top", (event.pageY) + "px"); 
	})
	.on("mouseout", () => {
		// Hide when the mouse moves out of the dots
		lineTooltip.style("opacity", "0");
	})

	return line;
}
function renderLegend(svg, class1, class2) {
	const svgWidth = svg.style("width"), svgHeight = svg.style("height");
	
	const legendWidth = 0.13 * +svgWidth.substring(0, svgWidth.indexOf("px"));
	const legendHeight = 0.25 * +svgHeight.substring(0, svgHeight.indexOf("px"));
	const margin = 8;
	const legendPosition = { 
							 x: +svgWidth.substring(0, svgWidth.indexOf("px"))-(margin+legendWidth), 
							 y: (+svgHeight.substring(0, svgHeight.indexOf("px"))-legendHeight)/2 
						   };
						   console.log(legendPosition);

	const classBoxSize = 0.2 * legendWidth;
	const textAllowance = 13;

	const legendGroup = svg.append("g").attr("transform", `translate(${legendPosition.x}, ${legendPosition.y})`)
						   .attr("class", "legend");
	const legendRect = legendGroup.append("rect")
	   						   		  .attr("x", 0)
	   						   		  .attr("y", 0)
	   						   		  .attr("width", legendWidth)
	   						   		  .attr("height", legendHeight)
	   						   		  .attr("class", "legend-rect")

	const class1Group = legendGroup.append("g").attr("transform", "translate(10, 10)");
	const class2Group = legendGroup.append("g").attr("transform", `translate(10, ${legendHeight/2})`);
	
	const text1Group = class1Group.append("text")
								 .attr("transform", `translate(${classBoxSize+margin}, ${textAllowance})`)
								 .selectAll("tspan")
								 .data(class1.text)
								 .enter()
								 .append("tspan")
								 .attr("x", 0)
								 .attr("y", (d, i) => {
								 	return i * (textAllowance+margin/2);
								 })
								 .text((d) => d);



	class1Group.append("rect")
	   		   .attr("x", 0)
	   		   .attr("y", 0)
	   		   .attr("width", classBoxSize)
	   		   .attr("height", classBoxSize)
	   		   .attr("fill", class1.color)
	   		   .attr("stroke", "white")
	
	const text2Group = class2Group.append("text")
								 .attr("transform", `translate(${classBoxSize+margin}, ${textAllowance})`)
								 .selectAll("tspan")
								 .data(class2.text)
								 .enter()
								 .append("tspan")
								 .attr("x", 0)
								 .attr("y", (d, i) => {
								 	return i * (textAllowance+margin/2);
								 })
								 .text((d) => d);



	class2Group.append("rect")
	   		   .attr("x", 0)
	   		   .attr("y", 0)
	   		   .attr("width", classBoxSize)
	   		   .attr("height", classBoxSize)
	   		   .attr("fill", class2.color)
	   		   .attr("stroke", "white")
	return legendGroup;
}