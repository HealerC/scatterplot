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
* This method renders the whole scatterplot (itself and by calling other methods)
*/
function renderData(data) {
	/* Colors used for each dot depending on whether the cyclists allegedly doped or not */
	const dopeColor = "#137B80";
	const noDopeColor = "#E6842A";
	
	/* The SVG element is already on the html. The width and height has already been set using CSS */
	const svg = d3.select("svg");
	let width = svg.style("width");		// The width was set using CSS and is therefore
										// a string with corresponding unit (e.g. "1000px")
	width = +width.substring(0, width.indexOf("px"));	// Remove the unit and convert 
														// to a unitless number (how SVG likes)

	let height = svg.style("height")	// Same as width
	height = +height.substring(0, height.indexOf("px"));

	const margin = { left: 60, top: 60, right: 60, bottom: 60 }; // The space around the four sides of the svg
	
	/* The scales maps the values of the dataset to the dimensions of the SVG.
	   Year is on the x axis and while the fastest time of the cyclist is on the y axis */
	const xScale = d3.scaleLinear()
					 .domain([d3.min(data, d => d.Year-1), d3.max(data, d => d.Year+1)])
					 		// Range of input year should be one less than and one greater than the smallest
					 		// and largest year respectively.
					 .range([margin.left, width - margin.right])	// There should be space around the graph
	
	/* The minimum and maximum time to be used for the yScale gotten by manually inspecting the values */
	const minTime = new Date("2000-05-27T00:36:00");
	const maxTime = new Date("2000-05-27T00:40:00");
	const yScale = d3.scaleTime()					// Maps time to svg dimensions
					 .domain([minTime, maxTime])	// The min and max extent of time
					 .range([margin.top, height - margin.bottom]);	
					 		// The cyclist with the least time should be the one higher in the graph
	
	const DATE = "2000-05-27T00:"	// Raw time cannot go alone. As the minTime and maxTime is above,
									// the cyclist's time has to be appended to any valid date to have a valid
									// date object. Fun Quiz:- What's so special about the date I used?
	
	/* In the scatterplot, when the user clicks on the legend, line relationship appears between dots
	   belonging to the same person. This array holds objects where each object contains the name of a person
	   that has more than one data point in the graph as well as the coordinates of the datapoints in an array 
	   
	   Also it also has the doping state of the person so that lines with selective colors can be drawn.

	   Foreseen issues - What if the cyclist doped in one but not the other? It didn't happen in this dataset
	   so we can just ignore and leave it that all that doped, doped in all and vice-versa*/
	let datasetFreq = [];
	
	const dots = svg.selectAll("circle")
	   				.data(data)
					.enter()
					.append("circle")
					.attr("data-xvalue", (d) => d.Year)		// FCC required including yvalue below
					.attr("data-yvalue", (d) => new Date(DATE + d.Time))
					.attr("cx", (d) => xScale(d.Year) )
					.attr("cy", (d) => yScale(new Date(DATE + d.Time)) )		
					.attr("class", (d) => d.Doping ? "dot dope" : "dot no-dope")
					.attr("r", function(d) {
						populateDatasetFreq(d, d3.select(this));
						return 7;
					});
	/* 
	* @method populateDatasetFreq Here is the last point in making each dot. 
	* We can get all the details so far and add them to the datasetFreq array. 
	* Later it will be filtered for only those cyclists that have more than one data point. 
	* @param d The data in the dataset
	* @param dotElement The circle svg (dot) that contains the data for its coordinates
	*/
	function populateDatasetFreq(d, dotElement) {
		let name = d.Name;
		let newCoords = dotElement.attr("cx") + "," + dotElement.attr("cy");	// The coordinates
		let doping = d.Doping ? true : false;

		/* Find out if the new name is already in the array so we just push the 
		new coordinates else we add the person for the first time */
		let index = datasetFreq.findIndex((value) => value.name === name);
		index >= 0 ? datasetFreq[index].coords.push(newCoords) : 
					 datasetFreq.push({name: name, coords: [newCoords], isDoping: doping})
	}

	/* We've gotten all needed. The names, dope status and coordinates.
	We only need those with more than one datapoint to draw lines between them.
	Filter the array to remove those that have just one point */
	datasetFreq = datasetFreq.filter((value) => value.coords.length > 1)
	
	console.log(datasetFreq);
	

	/* The group elements that contain the axes returned from the function that 
	rendered the axes and used subsequently to render the x and y axes labels */
	const { xg, yg } = renderAxis(svg, xScale, yScale, { height, margin });
	
	/* The axis labels - Time (minutes), Year */
	renderAxisLabel(xg, yg, { width, height });
	
	/* The tooltip that shows when the mouse is over the dots */
	renderTooltip(dots);

	/* The group element that contains all polylines drawn between dots 
	with more than one datapoints  */
	const line = drawLineRelationships(svg, datasetFreq);

	/* The legend - box showing the key color codes and representation. Each objet represents 
	a key with its color and the text. The text is in form of an array for it to render each text
	on different lines.) */
	const legend = renderLegend( { svg, width, height }, { text: ["Doping", "Allegations"], color: dopeColor}, 
				  { text: ["No Doping", "Allegations"], color: noDopeColor} );


	/* The essence of getting the legend and the line elements is for the legend to control
	the visualization of the lines. The lines do not show at default. When the legend is clicked,
	the line shows */
	let lineIsShowing = false;
	legend.on("click", () => {
		/* if lineIsShowing - hide it, else - make it show. A class is added to the legend itself
		to change its stroke color if the lines are showing */
		if (lineIsShowing) {
			line.style("visibility", "hidden");
			legend.node().classList.remove("line-on");
		} else {
			line.style("visibility", "visible");
			legend.node().classList.add("line-on");
		}
		lineIsShowing = !lineIsShowing;
	});
}

/**
 *  @method renderAxis
 *  @param {Object} svg svg d3 selection that contains the scatterplot
 *  @param {Object} xScale maps the dataset to the svg dimensions for x axis (Year)
 *  @param {Object} yScale maps the dataset for the y axis (Time in minutes)
 *  @param {Object} dimensions contains the height and margins used in the program
 *  @return {Object} the group elements for the newly created x and y axes
 */
function renderAxis(svg, xScale, yScale, dimensions) {
	const { height, margin } = dimensions;

	const xAxis = d3.axisBottom(xScale)
					.tickFormat(d => String(d));
					// The default shows the dates like numbers (e.g. 1,950)
	
	const timeFormat = d3.timeFormat("%M:%S");
	const yAxis = d3.axisLeft(yScale)
					.tickFormat(d => timeFormat(d));
					// The default shows the date used to make the Date object (2000-05-27)
	
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
 * @method renderAxisLabel renders the labels for the x and y axis - Year, Time (minutes)
 * @param {Object} xg The group element created for the x axis
 * @param {Object} yg The group element created for the y axis
 * @param {Object} dimensions The dimensions (width and height) needed 
 * to compute the positioning for the labels
 */
function renderAxisLabel(xg, yg, dimensions) {
	const { width, height } = dimensions;
	
	xg.append("text")
	  .attr("class", "label")
	  .text("Year")
	  .attr("x", width/2)
	  .attr("y", 40);
		  // The x axis label should be centered horizontally and 
		  // should go under the axis

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
* @param {Object} dots each dot of the scatterplot
*/
function renderTooltip(dots) {
	/* The tooltip is a div element that can be positioned anywhere in the document
	(due to the absolute positioning [css] to the body of the html) and is hidden 
	when the user does not hover over it. */
	const tooltip = d3.select("body")
					  .append("div")
					  .attr("id", "tooltip")
					  .style("opacity", "0")
					  .on("mouseover", function() {
					  	/* The tooltip is clickable. It should be opaque and shadows should show
					  	when it mouse is over it */
					  	d3.select(this).style("opacity", 1);
					  	d3.select(this).style("box-shadow", "0 4px 8px 0 "
					    + "rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19)");
					   })
					   .on("mouseleave", function() {
					   	 /* Remove the shadow and hide the tooltip when mouse leaves it */
					   	 d3.select(this).style("box-shadow", "none")
					   	 d3.select(this).style("opacity", 0);
					   	 d3.select(this).style("visibility", "hidden");
					   })
					   
	// Show the tooltip with the data on mouse over
	dots.on("mouseover", function(event, d) {	
		tooltip.style("visibility", "visible").style("opacity", "1")
		       .html(getDisplay(d))
		       .attr("data-year", d.Year)			// required in FCC tests
		       // The tooltip shows at the position of the mouse
		       .style("left", (event.pageX) + "px")
	      	   .style("top", (event.pageY) + "px")
	      	   .style("background-color", () => {
	      	   		/* The background color of the tooltip changes depending on the dope status */
	      	   		return d.Doping ? "rgba(188, 223, 228, 0.8)" : 
	      	   						  "rgba(250, 226, 189, 0.8)";
	      	   }); 
	})
	.on("mouseout", () => {
		// Hide when the mouse moves out of the dots
		tooltip.style("opacity", "0");
	});

	/*
 	* @method getDisplay gets and formats the data that will be displayed
 	* when the user's mouse is over the dots
 	* @param {string} d The data that will be represented/shown in the tooltip
 	* @return {string} output a string with the correct format in html
	*/
	function getDisplay(d) {
		let output = "";
		/* If URL is not available, it should not render a link (a) element. This is required because
		an icon shows after every link element (even if it is empty)*/
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
/**
 * @method drawLineRelationships draws lines that join dots that belong to the same person.
 * @param svg the svg element of the scatterplot
 * @param data the special dataset containing each person with his coordinates and dope status
 * @returns line all the lines are under a group element and it will call a method that will
 * render a tooltip for each polyline
 */
function drawLineRelationships(svg, data) {
	const line = svg.insert("g", ":first-child")
					// If the lines are the last thing in the svg, it will appear above the dots
	   				.selectAll("polyline")
	   				// A polyline element uses lines to connects coordinates
				    .data(data)
				    .enter()
				    .append("polyline")
				    .attr("points", (d) => {
				   		return d.coords.join(" ");
				     })
				    .attr("class", (d) => {
				   		return d.isDoping ? "dope" : "no-dope"
				     })
				    .attr("fill", "none")
				    // So that the polyline does not try to form a filled shape (like a polygon)
					.style("visibility", "hidden");
					// Does not show on load
	return renderLineTooltip(line);
}
/*
 * @method renderLineTooltip Tooltip that shows when you hover on the line that 
 * joins members with more than one datapoint. It basically just shows the name of the person.
 * @param line The line group element that has the polyline children that has a data source
 * @return line The same line but now tooltip rendered on hover
 */
function renderLineTooltip(line) {
	const lineTooltip = d3.select("body")
					      .append("div")
					      .attr("id", "line-tooltip")
					      .style("opacity", "0");
	
	// Show the tooltip with the data on mouse over
	line.on("mouseover", function(event, d) {	
		lineTooltip.style("opacity", "1")
		       .html(d.name)
		       // Same as regular tooltip. Show at the mouse position.
		       .style("left", (event.pageX) + "px")
	      	   .style("top", (event.pageY) + "px"); 
	})
	.on("mouseout", () => {
		// Hide when the mouse moves out of the dots
		lineTooltip.style("opacity", "0");
	})

	return line;
}
/*
 * @method renderLegend legend of the graph. Perhaps in the future it can be made generic
 * but for now the implementation is specific to this project.
 * @param {Object} dimensions the svg as well as its width and height of the scatterplot
 * @param {Object} class1 One of the classes. An object containing the text and the color
 * @param {Object} class2 The other class. Description same as class1
 * @return {Object - d3 g} legendGroup The legend which will subsequently be used to control
 * the lines in the scatterplot
 */
function renderLegend(dimensions, class1, class2) {	
	const { svg, width: svgWidth, height: svgHeight} = dimensions;
	
	/* The width and height of the legend */
	const legendWidth = 0.13 * svgWidth;
	const legendHeight = 0.25 * svgHeight;

	/* The general margin of the legend and it's children 0*/
	const margin = 8;

	/* The x and y position of the legend */
	const legendPosition = { 
							 x: svgWidth-(margin+legendWidth), 
							 y: (svgHeight-legendHeight)/2 
						   };

	const classBoxSize = 0.2 * legendWidth;	// Class of the square in the legend
	
	/* The text element has its x and y position at its bottom right baseline so its (0, 0)
	is not at the same level with a rect at that same position. The allowance is to move the text
	down. Although a better way is to use getBBox().height to get the height of the text and 
	then move it accordingly. */
	const textAllowance = 13;

	/* The legend that contains all the elements - big rectangle, small rectangles, texts.
	Translate the legend to the required position so that positioning the children will be easier */
	const legendGroup = svg.append("g").attr("transform", `translate(${legendPosition.x}, ${legendPosition.y})`)
						   			   .attr("class", "legend").attr("id", "legend");
	
	/* The big rectangle. It's can be given a (0, 0) as its (x, y) because it's position becomes
	relative to that of its parent (g) element */
	const legendRect = legendGroup.append("rect")
	   						   	  .attr("x", 0)
	   						   	  .attr("y", 0)
	   						   	  .attr("width", legendWidth)
	   						   	  .attr("height", legendHeight)
	   						   	  .attr("class", "legend-rect");

	/* Each class group containing the rectangle with a specified color and the text */
	const class1Group = legendGroup.append("g").attr("transform", `translate(${margin}, ${margin})`);
	const class2Group = legendGroup.append("g").attr("transform", `translate(${margin}, ${legendHeight/2})`);
						// Since there are only two groups its safe to position the second group roughly
						// halfway the legend though a better solution will be to take into account the height of 
						// the previous class group as well as the margins.
	
	/* The rectangle of the first group. 
	It can be position (0, 0) because of it's parent positioning */
	class1Group.append("rect")
	   		   .attr("x", 0)
	   		   .attr("y", 0)
	   		   .attr("width", classBoxSize)
	   		   .attr("height", classBoxSize)
	   		   .attr("fill", class1.color)
	   		   .attr("stroke", "white")

	/* The text of the first group. It should be positioned after the box and the margin
	and it has tspan children which will bear the text */
	const text1Group = class1Group.append("text")
								 .attr("transform", `translate(${classBoxSize+margin}, ${textAllowance})`)
								 .selectAll("tspan")
								 .data(class1.text)
								 .enter()
								 .append("tspan")
								 .attr("x", 0)
								 .attr("y", (d, i) => {
								 	// So that the text shows rightly under the previous
								 	return i * (textAllowance+margin/2);
								 })
								 .text((d) => d);

	/* SAME AS ABOVE WITH CHANGE ONLY TO THE CLASS. IT'S WRONG TO REPEAT CODE BUT HERE WE ARE ...*/
	class2Group.append("rect")
	   		   .attr("x", 0)
	   		   .attr("y", 0)
	   		   .attr("width", classBoxSize)
	   		   .attr("height", classBoxSize)
	   		   .attr("fill", class2.color)
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
	return legendGroup;
}