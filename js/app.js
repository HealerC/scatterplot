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
* @param {Object - Array} data The dataset used in the program. An  array where each entry has the 
* data for each of the cyclists
* This method renders the scatterplot
*/
function renderData(data) {
	const svg = d3.select("svg");

	let width = svg.style("width");		// The width was set using CSS and is therefore
										// a string with corresponding unit
	width = +width.substring(0, width.indexOf("px"));	// Remove the unit and convert 
														// to a unitless number (how SVG likes)


	let height = svg.style("height")	// Same as width
	height = +height.substring(0, height.indexOf("px"));

	padding = 63;						// The space around the four sides of the svg
	
	/* The scales maps the values of the dataset to the dimensions of the SVG.
	   Year is on the x axis and while the fastest time of the cyclist is on the y axis */
	let minYear = d3.min(data, d => d.Year);
	let maxYear = d3.max(data, d => d.Year);

	const xScale = d3.scaleLinear()
					 .domain([d3.min(data, d => d.Year), d3.max(data, d => d.Year)])	// The years  
					 .range([padding, width - padding])	// There should be space around
					 .padding(0.3)		// Space between the particular bars
					 .round(true)		// Anti-aliasing
					 .align(0.1);		// To bring the bars close to the origin due to the 
					 					// extra space because of anti-aliasing
	
	const yScale = d3.scaleLinear()		// Maps the quantitative dataset
					 .domain([0, d3.max(data.map(d => d[1]))])	// The GDP
					 .range([height - padding, padding]);	// The lowest value has 
										// the highest height (bottom - top)

	const bars = svg.selectAll("rect")
	   				.data(data)
					.enter()
					.append("rect")
					.attr("class", "bar")
					.attr("data-date", (d) => d[0])
					.attr("data-gdp", (d) => d[1])
					.attr("x", (d) => xScale(d[0]))
					.attr("y", height-padding)		// The y attribute and height
												// takes a value which an animation will
												// grow the bars to their normal height
					.attr("width", xScale.bandwidth())	// The scale determines the height
														// of each bar
					.attr("height", 0);			// Same as above for attribute "y"

	/* The effect of this is for the bars of the bar chart to grow (animate) from 0
	to its true height when the page loads. */
	bars.transition().duration(1000)
		.attr("y", (d) => yScale(d[1]))
		.attr("height", (d) => height-padding - yScale(d[1]))
	
	/* The group elements that contain the axes returned from the function that 
	rendered the axes and used subsequently to render the x and y axes labels */
	const { xg, yg } = renderAxis(svg, xScale, yScale, { height, padding });
	renderAxisLabel(xg, yg, { width, height });
	
	renderTooltip(bars);				// The tooltip that shows on mouseover the bars
	addDateToClipboard(bars);
}

/**
 *  @method renderAxis
 *  @param {Object} svg svg d3 selection that contains the bar chart
 *  @param {Object} xScale maps the dataset to the svg dimensions for x axis
 *  @param {Object} yScale maps the dataset for the y axis
 *  @param {Object} dimensions contains the height and padding used in the program
 *  @return {Object} Returns the group elements for the x and y axes
 */
function renderAxis(svg, xScale, yScale, dimensions) {
	const { height, padding } = dimensions;

	const xAxis = d3.axisBottom(xScale)
					// The tick values should be numbers divisible by 5
					.tickValues(getTickValues(xScale))
					// The tick should only show the year instead of the full date
					.tickFormat(d => d.substring(0, 4));

	const yAxis = d3.axisLeft(yScale);

	const xg = svg.append("g")
				  .attr("id", "x-axis")
	   			  .attr("transform", `translate(0, ${height-padding})`)
	   			  .call(xAxis);

	const yg = svg.append("g")
				  .attr("id", "y-axis")
	   			  .attr("transform", `translate(${padding}, 0)`)
	              .call(yAxis);

	/**
	 * @method getTickValues
	 * @param {Object} scale the scale of the axis
	 * @return an array containing only the data we want to show in the ticks
	 */
	function getTickValues(scale) {
		let filteredScale = [];				// The data we want to show in the ticks

		scale.domain().forEach(d => {
			let value = +d.substring(0, 4);	// Convert the year to a number
			
			// The number should be divisible by 5 and also the date should not already
			// be in the filtered dates (filteredScale). There are at least four dates
			// with same year for the four quarters so we want to show the year once.
			if (value % 5 === 0 && !checkArray(filteredScale, value)) {
				filteredScale.push(d);	// Push the date to the filtered array 
										// if it satisfies the above conditions
			}
		});

		return filteredScale;			// The filtered array

		/**
  		* @method checkArray
  		* @param {Object} arr The array of the data we want to peruse
  		* @param {String/Number} value The value we are testing if it is in `arr`
  		* @return {Boolean} returns true if the value regex matches any entry in the array 
		* The value is converted to a regex and used to test each array entry
		* Example: 1947 in 1947-01-01.
		* `String.indexOf` should still work in this case. I just realized that.
		*/
		function checkArray(arr, value) {
			let re = new RegExp(value, "i");
			for (let data in arr) {
				// Test each data in the array if it matches the regex provided
				if (re.test(arr[data])) {
					return true;
				}
			}
			return false;
		}
	}
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
	  .text("Year (Quaterly from 1947 to 2015)")
	  // The x axis label should be at the centered horizontally and 
	  // should go under the axis
	  .attr("x", width/2)
	  .attr("y", 45);

	yg.append("text")
	  .attr("class", "label")
	  .text("Gross Domestic Product (billions of dollars)")
	  // The parameters were just chosen to fit in. I honestly have not mastered
	  // rotation in svg but it just works
	  .attr("x", -(height-350)/2)
	  .attr("y", -50)
	  .attr("transform", `rotate(-90)`);
}

/*
* @method renderTooltip shows a tooltip when the user hovers on any of the bars
* the tooltip shows the quarter of the year and the GDP of that quarter
* @param {Object} bars each bar of the bar chart (a rect d3 selection)
*/
function renderTooltip(bars) {
	/* The tooltip is a div element that can be positioned anywhere in the document
	(due to the absolute positioning [css]) and is hidden when the user does not 
	hover over it. */
	const tooltip = d3.select("body")
					   .append("div")
					   .attr("id", "tooltip")
					   .style("visibility", "hidden");
	
	// Show the tooltip with the data on mouse over
	bars.on("mouseover", function(event, d) {
		let tooltipDisplay = getDisplay(d);		// Get the text that will be displayed
												// formatted with Html

		tooltip.style("visibility", "visible")
		       .html(getDisplay(d))
		       .attr("data-date", d[0])			// required in FCC tests
		       // Displacement on the x axis should be some distance from the mouse
		       .style("left", (event.pageX+30) + "px")
		       // Displacement on the y axis should be constant (60%) of the screen height
	      	   .style("top", (0.6*screen.availHeight) + "px"); 
	})
	.on("mouseout", () => {
		// Hide when the mouse moves out of the bars
		tooltip.style("visibility", "hidden");
	})

	/*
 	* @method getDisplay gets and formats the data that will be displayed
 	* when the user's mouse is over the bar
 	* @param {string} d The data that will be represented/shown in the tooltip
 	* @return {string} output a string with the correct format in html
	*/
	function getDisplay(d) {
		let output = "";
		let date = new Date(d[0]);	// Convert to date so as to get the year
									// and month easily rather than parsing the string

		output += date.getFullYear();	// The year (e.g. 2010)
		
		const month = date.getMonth();	// Month is numbered from 0 to 11

		output += " Q";		// From the month, the quarter of the year is evaluated
		switch (month) {
			/*
			 * Month is labelled from 0 to 11. 
			 * Therefore 0 is 1st month (January) - first quarter
			 * 3 is 4th month (April) - second quarter
			 * 6 is 7th month (July) - third quarter
			 * 9 is 10th month (October) - fourth quarter
			 */
			case 0:
				output += 1;
				break;
			case 3:
				output += 2;
				break;
			case 6:
				output += 3;
				break;
			case 9:
				output += 4;
				break;
			default:
				output += 0;
		}

		output += "<br />";
		output += `${d[1]} billion`;	// The GDP for the particular quarter

		return output;		// The Quarter of the year and GDP formatted as in HTML
	}
}
/**
 * @method addDateToClipboard adds the date the person doubleclicks to the clipboard
 * @param {Object} bars the rect d3 selection that the person doubleclicked
 */
function addDateToClipboard(bars) {
	bars.on("dblclick", function(event, data) {
		const value = `Date: ${data[0]}, GDP: $${data[1]} billion`;  // Format of the data
		copyToClipboard(value);
	});

	/*
   	 * @method copyToClipboard copies a value to clipboard
   	 * @param {string} the value to be copied to the clipboard
	 */
	function copyToClipboard(value) {
		/*
		 * A technique of copying text to clipboard is to select text in a textbox
		 * and copy it to the keyboard. A dummy text input box is made to accomodate
		 * the text and from here it is copied to the clipboard.
		 */
		const test = document.createElement("input");	// Creates the textbox
		document.body.appendChild(test);				// Appends it to a document
		test.setAttribute("id", "test");	// Gives it an id in case of customization
		test.style.visibliity = "hidden";	// Hides it so it is not seen in the page

		document.getElementById("test").value = value;
		test.select();						// The element is first selected
		document.execCommand("copy");		// The command that actually copies the text

		alert(`"${value}"` + " copied to clipboard");	// Text that displays after copying

		document.body.removeChild(test);	// We don't need the element anymore
	}
}