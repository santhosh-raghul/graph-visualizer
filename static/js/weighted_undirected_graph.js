// ethereum.autoRefreshOnNetworkChange = false;

var drag_element, svg, position, transform, node1, node2, current_edge, delete_edge, test;
var node_id = 22, node_circle_radius = "8px", background_color = "white", node_label_font_size="12px", node_label_dy="4px";

var visited, track, sub_path;
var i,j,u,v,u_prev,v_prev,edge,path,playing=false;

function getMousePosition(evt)
{
	var CTM = svg.getScreenCTM();
	return { x: (evt.clientX - CTM.e) / CTM.a, y: (evt.clientY - CTM.f) / CTM.d };
}

function close(pos1,pos2)
{
	return ( (pos1.x-pos2.x)**2 + (pos1.y-pos2.y)**2 ) <= 5;
}

function makeDraggable(evt)
{
	svg = evt.target;
	svg.addEventListener('mousedown', startDrag);	svg.addEventListener('touchstart', startDrag);
	svg.addEventListener('mousemove', drag);	svg.addEventListener('touchmove', drag);
	svg.addEventListener('mouseup', endDrag);	svg.addEventListener('touchend', endDrag);
	svg.addEventListener('mouseleave', endDrag);	svg.addEventListener('touchleave', endDrag);	svg.addEventListener('touchcancel', endDrag);
	svg.addEventListener('mousemove', star_drawing_edge);	svg.addEventListener('touchmove', star_drawing_edge);

	function startDrag(evt)
	{
		position = getMousePosition(evt);
		if (evt.target.classList.contains('draggable'))
		{
			drag_element = evt.target.parentNode;
			var transforms = drag_element.transform.baseVal;
			if (transforms.length === 0 || transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE)
			{
				var translate = svg.createSVGTransform();
				translate.setTranslate(0, 0);
				drag_element.transform.baseVal.insertItemBefore(translate, 0);
			}
			transform = transforms.getItem(0);
			position.x_offset = position.x - transform.matrix.e;
			position.y_offset = position.y - transform.matrix.f;
		}
		else if( evt.target.parentNode.parentNode.id == 'edges' && evt.which === 3 )
		{
			delete_edge = evt.target.parentNode;
		}
	}

	function drag(evt)
	{
		if (drag_element)
		{
			evt.preventDefault();
			var coord = getMousePosition(evt), x1,x2,y1,y2;
			transform.setTranslate(coord.x - position.x_offset, coord.y - position.y_offset);
			var edges = document.getElementById("edges").children;
			for (var i = 0; i < edges.length; i++)
			{
				edge = edges[i].id.split(" ");
				x1 = edges[i].children[0].getAttributeNS(null,"x1");
				y1 = edges[i].children[0].getAttributeNS(null,"y1");
				x2 = edges[i].children[0].getAttributeNS(null,"x2");
				y2 = edges[i].children[0].getAttributeNS(null,"y2");

				if(edge[0]==drag_element.id)
					move_edge(edges[i],coord.x,coord.y,x2,y2);
				else if(edge[1]==drag_element.id)
					move_edge(edges[i],x1,y1,coord.x,coord.y);
			}
		}
	}

	function endDrag(evt)
	{
		if(drag_element && !close(position,getMousePosition(evt)))
			drag_element = null;
		else if(drag_element)
		{
			if(node1)
			{
				node2 = drag_element;
				create_edge(evt);
			}
			else
			{
				node1 = drag_element;
				if (evt.which === 3)
				{
					drag_element = null;
					remove_node(node1);
					node1 = null;
				}
				else
					start_drawing_edge(evt);
			}
			drag_element = null;
		}
		else if (evt.type != "mouseleave" && evt.type!="touchleave" && evt.type!="touchcancel" && close(position,getMousePosition(evt)) && !current_edge)
		{
			if (evt.target.parentNode.id == "graph_area_main_svg")
				create_node(evt);
			else if ( evt.target.parentNode.parentNode.id == "edges" && evt.target.nodeName == "text" )
				update_edge_weight(evt.target.parentNode);
		}
		else if (current_edge)
		{
			current_edge.remove();
			current_edge = null;
			node1 = null;
			node2 = null;
		}
		if (delete_edge)
		{
			remove_edge(delete_edge);
			delete_edge = null;
		}
	}

	function start_drawing_edge(evt)
	{
		current_edge = document.createElementNS(svgNS,"line");
		current_edge.setAttributeNS(null,"class","edge_main");

		position = getMousePosition(evt);

		current_edge.setAttributeNS(null,"x1",position.x);
		current_edge.setAttributeNS(null,"y1",position.y);
		current_edge.setAttributeNS(null,"x2",position.x);
		current_edge.setAttributeNS(null,"y2",position.y);

		document.getElementById("edges").appendChild(current_edge);
	}

	function star_drawing_edge(evt)
	{
		if (current_edge)
		{
			position = getMousePosition(evt);
			current_edge.setAttributeNS(null,"x2",position.x);
			current_edge.setAttributeNS(null,"y2",position.y);
		}
	}

}

var svgNS = "http://www.w3.org/2000/svg";

function draw_node(node_id,coord)
{
	var node = document.createElementNS(svgNS,"g");
	node.setAttributeNS(null,"id",node_id);

	var node_circle = document.createElementNS(svgNS,"circle");
	node_circle.setAttributeNS(null,"cx",coord.x);
	node_circle.setAttributeNS(null,"cy",coord.y);
	node_circle.setAttributeNS(null,"r",node_circle_radius);
	node_circle.setAttributeNS(null,"class","draggable node_circle");

	var node_label = document.createElementNS(svgNS,"text");
	node_label.setAttributeNS(null,"x",coord.x);
	node_label.setAttributeNS(null,"y",coord.y);
	node_label.setAttributeNS(null,"dy",node_label_dy);
	node_label.setAttributeNS(null,"class","draggable node_label");
	var textNode = document.createTextNode(node_id);
	node_label.appendChild(textNode);

	node.appendChild(node_circle);
	node.appendChild(node_label);
	document.getElementById("nodes").appendChild(node);
}

function create_node(evt)
{
	if (evt.which != 1) return;

	evt.preventDefault();
	draw_node(node_id,getMousePosition(evt));
	node_id+=1;
}

function draw_edge(id,coords)
{
	var edge = document.createElementNS(svgNS,"g");
	edge.setAttributeNS(null,"id",id);

	main_line = document.createElementNS(svgNS,"line"); main_line.setAttributeNS(null,"class","edge_main");
	main_line.setAttributeNS(null,"x1",coords.x1);
	main_line.setAttributeNS(null,"y1",coords.y1);
	main_line.setAttributeNS(null,"x2",coords.x2);
	main_line.setAttributeNS(null,"y2",coords.y2);

	tr_line = document.createElementNS(svgNS,"line"); tr_line.setAttributeNS(null,"class","edge_bg");
	tr_line.setAttributeNS(null,"x1",coords.x1);
	tr_line.setAttributeNS(null,"y1",coords.y1);
	tr_line.setAttributeNS(null,"x2",coords.x2);
	tr_line.setAttributeNS(null,"y2",coords.y2);

	var edge_weight = document.createElementNS(svgNS,"text");
	text_x = (coords.x1+coords.x2)/2; text_y = (coords.y1+coords.y2)/2;
	edge_weight.setAttributeNS(null,"x",text_x);
	edge_weight.setAttributeNS(null,"y",text_y);
	edge_weight.setAttributeNS(null,"dy",node_label_dy);
	edge_weight.setAttributeNS(null,"class","edge_weight");
	var textNode = document.createTextNode(1);
	edge_weight.appendChild(textNode);
	var angle = Math.atan((coords.y2-coords.y1)/(coords.x2-coords.x1))*180/Math.PI;
	edge_weight.setAttribute('transform',`rotate(${angle},${text_x},${text_y})`);

	edge.appendChild(tr_line);
	edge.appendChild(main_line);
	edge.appendChild(edge_weight);
	document.getElementById("edges").appendChild(edge);
}

function create_edge(evt)
{
	node1 = node1.getAttribute("id"); node2 = node2.getAttribute("id");
	var id = node1+" "+node2;
	var valid_edge = is_edge_valid(node1,node2);

	if(valid_edge)
	{
		var coords = {	x1 : parseFloat(current_edge.getAttributeNS(null,"x1")),
						y1 : parseFloat(current_edge.getAttributeNS(null,"y1")),
						x2 : parseFloat(current_edge.getAttributeNS(null,"x2")),
						y2 : parseFloat(current_edge.getAttributeNS(null,"y2"))	};
		draw_edge(id,coords);
	}

	current_edge.remove();
	current_edge = null; node1 = null; node2 = null;
}

function is_edge_valid(u,v)
{
	var id = u+" "+v;

	var edges = document.getElementById("edges").children;
	var valid_edge = (u!=v);
	if (valid_edge)
	{
		for (var i = 0; i < edges.length; i++)
		{
			edge = edges[i].id.split(' ');
			if ( (edge[0]==u && edge[1]==v) || (edge[0]==v && edge[1]==u) )
			{
				valid_edge = false;
				break;
			}
		}
	}

	return valid_edge;
}

function get_node_list()
{
	var nodes = document.getElementById("nodes").children;
	var node_list = [];
	for (var i = 0; i < nodes.length; i++)
	{
		node_list.push(nodes[i].id);
	}
	return node_list;
}

function get_edge_list()
{
	var edges = document.getElementById("edges").children, edge_list = [], edge;
	for (var i = 0; i < edges.length; i++)
	{
		edge = edges[i].id.split(" ");
		// edge.push(edges[i].children[2].innerHTML);
		edge_list.push(edge);
	}
	return edge_list;
}

function remove_node(node)
{
	label = node.id;
	node.remove();
	var edges = document.getElementById("edges").children;
	for (var i = 0; i < edges.length; i++)
	{
		edge = edges[i].id.split(" ");
		if ( (edge[0]==label) || (edge[1]==label) )
		{
			edges[i--].remove();
		}
	}
}

function remove_edge(edge)
{
	edge.remove();
}

function move_edge(edge,x1,y1,x2,y2)
{
	x1 = parseFloat(x1);
	y1 = parseFloat(y1);
	x2 = parseFloat(x2);
	y2 = parseFloat(y2);

	edge.children[0].setAttributeNS(null,"x1",x1);
	edge.children[0].setAttributeNS(null,"y1",y1);
	edge.children[0].setAttributeNS(null,"x2",x2);
	edge.children[0].setAttributeNS(null,"y2",y2);

	edge.children[1].setAttributeNS(null,"x1",x1);
	edge.children[1].setAttributeNS(null,"y1",y1);
	edge.children[1].setAttributeNS(null,"x2",x2);
	edge.children[1].setAttributeNS(null,"y2",y2);

	text_x = (x1+x2)/2; text_y = (y1+y2)/2;
	var angle = Math.atan((y2-y1)/(x2-x1))*180/Math.PI;
	edge.children[2].setAttributeNS(null,"x",text_x);
	edge.children[2].setAttributeNS(null,"y",text_y);
	edge.children[2].setAttribute('transform',`rotate(${angle},${text_x},${text_y})`);
}

function get_unweighted_graph()
{
	var nodes = get_node_list();
	var edges = get_edge_list();
	var graph = [];

	for (var i = 0; i < nodes.length; i++)
		graph[nodes[i]] = [];

	for (var i = 0; i < edges.length; i++)
	{
		graph[edges[i][0]].push(edges[i][1]);
		graph[edges[i][1]].push(edges[i][0]);
	}

	return graph;
}

function get_graph()
{
	var nodes = get_node_list();
	var edges = get_edge_list();
	var graph = [];

	for (var i = 0; i < nodes.length; i++)
		graph[nodes[i]] = [];

	for (var i = 0; i < edges.length; i++)
	{
		graph[edges[i][0]].push([edges[i][1],edges[i][2]]);
		graph[edges[i][1]].push([edges[i][0],edges[i][2]]);
	}

	console.log('here');
	return graph;
}

function update_edge_weight(edge)
{
	var ip = document.createElement("input");
	ip.setAttribute('type','number');
	ip.setAttribute('value',edge.children[2].innerHTML);

	ip.addEventListener('focusout',testfn);
	ip.addEventListener('keyup',testfn);

	document.body.appendChild(ip);
	ip.focus();
	ip.select();

	function testfn(evt)
	{
		if (evt.type=='keyup')
		{
			if (evt.key=="Enter")
				finalise_weight();
			else if (evt.key=="Escape")
				ip.remove();
		}
		else
			finalise_weight();
	}

	function finalise_weight()
	{
		if (ip.value==parseInt(ip.value))
			edge.children[2].innerHTML = ip.value;
		ip.remove();
	}
}

// ================== dfs =======================

function dfs_util(graph, node)
{
	var neighbours = graph[node];
	visited.push(parseInt(node));
	sub_path.push([node,"v"]);

	for (var i = 0; i < neighbours.length; i++)
	{
		var neighbour = neighbours[i];
		if ( ! ( visited.includes( parseInt(neighbour) ) ) )
		{
			while ( track.length &&  track[track.length-1][1]!=node )
			{
				var back_track_edge = track.splice(-1)[0];
				sub_path.push([back_track_edge[0],"b"]);
			}
			track.push([ node, neighbour ]);
			dfs_util(graph, neighbour);
		}
	}
}

function get_dfs_path(graph,start)
{
	sub_path = [];
	track = [];
	dfs_util(graph, start);
	while (track.length)
	{
		var back_track_edge = track.splice(-1)[0];
		sub_path.push([back_track_edge[0],"b"]);
	}
	return sub_path;
}

function get_dfs_paths(starting_node)
{
	var graph = get_unweighted_graph();
	var path = [];
	visited = [];
	for (const node in graph)
	colorNode(node, background_color);
	// CHANGE
	// var edges = get_edge_list();
	// console.log(edges);
	// for (const edge in edges)
	// 	colorEdge(edge[0],edge[1],null);

	path.push(get_dfs_path(graph,starting_node));

	var all = false;

	while (!all)
	{
		all = true;
		for (const node in graph)
			if ( ! ( visited.includes( parseInt(node) ) ) )
			{
				path.push(get_dfs_path(graph,node));
				all = false;
			}
	}
	return path;
}

function dfs(starting_node)
{
	i=0; j=-1; u=null; v=null; u_prev=null; v_prev=null; sub_path=null; edge=null; path=null;
	path = get_dfs_paths(starting_node);

	i_max = path.length-1;
	j_max = path[0].length-1;

}

function forward()
{
	j++;

	if ( !path || !path.length ) return;
	if (j>j_max) { i++; j=0; if (i<=i_max) j_max=path[i].length-1;}
	if (i>i_max) { i="end"; }

	if (v_prev) { if (v_prev) colorNode(v_prev,"blue"); if (u_prev) colorEdge(u_prev,v_prev,null); }
	if ( i=="end" ) return;

	u = (j-1)>=0 ? path[i][j-1][0] : null;
	v = path[i][j][0];
	set_state(u,v,path[i][j][1]);
	u_prev = u; v_prev = v;
}

function backward()
{
	j--;

	if ( !path || !path.length ) return;
	if (j<-1) { i--; if (i>=0) { j=path[i].length-1; j_max==path[i].length-1; } }
	if (i<0) { i=0; j=-1; }
	if (i=="end") { i=i_max; j=j_max; }

	if (u_prev!=null) colorEdge(u_prev,v_prev,null);
	if (j<j_max) { colorNode(v,path[i][j+1][1]=="b"?"blue":null); }

	if (j==-1) return;

	u = (j-1)>=0 ? path[i][j-1][0] : null;
	v = path[i][j][0];
	set_state(u,v,path[i][j][1]);
	u_prev = u; v_prev = v;
}

async function play()
{
	if ( !path || !path.length ) return;

	if (! playing)
	{
		playing = true;
		disable_drawing();
		var bwd = document.getElementById("bwd");
		var fwd = document.getElementById("fwd");
		var run = document.getElementById("run");
		var play = document.getElementById("play");
		play.innerHTML = "stop";

		bwd.disabled = true; fwd.disabled = true; run.disabled = true;
		while(i!="end" && playing)
		{
			forward();
			await sleep(1000);
		}
		play.innerHTML = "play";
		bwd.disabled = false; fwd.disabled = false; run.disabled = false;
		enable_drawing();
	}
	else
		playing = false;
}

async function set_state(u,v,state)
{
	if (state=="v")
	{
		if (u) { colorEdge(u,v,"yellow"); /* await sleep(300); */ }
		colorNode(v,"yellow");
	}
	else
	{
		colorEdge(u,v,"red"); /* await sleep(300); */ colorNode(v,"orange");
	}
}

// ================== dfs end =======================

function colorNode(node,color)
{
	color = color ? color : background_color;
	document.getElementById(node).children[0].style.fill = color;
}

function colorEdge(u,v,color)
{
	color = color ? color : "rgba(0,0,0,0)";
	var edge = document.getElementById(u+" "+v) ? document.getElementById(u+" "+v) : document.getElementById(v+" "+u);
	edge.children[0].style.stroke = color;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function disable_drawing()
{
	document.getElementById("graph_area_container").classList.add("disabled");
}

function enable_drawing()
{
	document.getElementById("graph_area_container").classList.remove("disabled");
}

// ================== bfs =====================
class Queue
{
    // Array is used to implement a Queue
    constructor()
    {
        this.items = [];
    }
                  
    // Functions to be implemented
    enqueue(element){    
    	this.items.push(element);
		}	
    dequeue(){
			if(this.isEmpty())
        return "Underflow";
    	return this.items.shift();	
		}
    front(){
			if(this.isEmpty())
        return "No elements in Queue";
    	return this.items[0];
		}
    isEmpty(){return this.items.length == 0;}
    printQueue(){
			var str = "";
    	for(var i = 0; i < this.items.length; i++)
        str += this.items[i] +" ";
    	return str;
		}
}

var bfspath, levels, step;
async function bfs_of_component(node)
{
	var graph = get_unweighted_graph();
	var q = new Queue();
	//var visited = []
	levels = [];
	levels[node] = 0;
	q.enqueue(node);
	//console.log(node);
	bfspath.push(["NULL",node.toString()]);
	visited.push(parseInt(node))

	while(!q.isEmpty()){
		var ele = q.front();
		q.dequeue();
		var neighbours = graph[ele];
		for (var i = 0; i < neighbours.length; i++)
		{
			var neighbour = neighbours[i];
			if ( ! ( visited.includes( parseInt(neighbour) ) ) )
			{
				levels[neighbour] = levels[ele]+1;
				//console.log(neighbour+" at lvl "+levels[neighbour]);
				visited.push(parseInt(neighbour));
				bfspath.push([ele.toString(),neighbour]);
				
				q.enqueue(neighbour);
			}
		}
	}

}

async function bfs(starting_node)
{
	var graph = get_unweighted_graph();
	var node_list = get_node_list();
	step = 0;
	for (var i = 0; i < node_list.length; i++){
		var n = node_list[i];
		colorNode(n,null);
	}
	visited = [];
	bfspath = [];
	await bfs_of_component(starting_node);
	
	//console.log(','+visited)
	var all = false;
	while (!all)
	{
		all = true;
		for (const node in graph)
			if ( ! ( visited.includes( parseInt(node) ) ) )
			{
				await bfs_of_component(node);
				all = false;
			}
	}
	console.log(bfspath);
}

async function bfs_backward()
{
	if(step>0){
		step=step-1;
		var ele = bfspath[step][0];
		var neighbour = bfspath[step][1];
		if(ele=="NULL"){
			if(step>=1 && bfspath[step-1][0]!="NULL"){
				colorNode(bfspath[step-1][0],"orange");
				colorEdge(bfspath[step-1][0],bfspath[step-1][1],"yellow");
			}
			colorNode(neighbour,null);
			console.log("if here");
			
		}
		else{
			if(bfspath[step-1][0]!="NULL"){
				colorNode(bfspath[step-1][0],"orange");
				colorEdge(bfspath[step-1][0],bfspath[step-1][1],"yellow");
			}
			console.log("else here");
			colorNode(ele,"blue");
			colorNode(neighbour,null);
			colorEdge(ele,neighbour,null);
			
		}
		
	}


	//bfs_forward();
}

async function bfs_forward()
{
	if(step<bfspath.length){
		var ele = bfspath[step][0];
		var neighbour = bfspath[step][1];
		if(ele=="NULL"){
			if(step>=1 && bfspath[step-1][0]!="NULL"){
				colorNode(bfspath[step-1][0],"blue");
				colorEdge(bfspath[step-1][0],bfspath[step-1][1],null);
			}
			colorNode(neighbour,"yellow");
			await sleep(1000);
			colorNode(neighbour,"blue");
		}
		else{
			if(bfspath[step-1][0]!="NULL"){
				colorNode(bfspath[step-1][0],"blue");
				colorEdge(bfspath[step-1][0],bfspath[step-1][1],null);
			}
			colorNode(ele,"orange");
			colorNode(neighbour,"yellow");
			colorEdge(ele,neighbour,"yellow");
			await sleep(1000);
			colorNode(neighbour,"blue");
			//colorNode(ele,"blue");
			//colorEdge(ele,neighbour,null);
		}
		step++;
	}
	else{
		if(step>=1 && bfspath[step-1][0]!="NULL"){
			colorNode(bfspath[step-1][0],"blue");
			colorEdge(bfspath[step-1][0],bfspath[step-1][1],null);
		}
	}
}

async function bfs_show()
{
	while(step<bfspath.length){
		await bfs_forward();
	}
	if(step>=1 && bfspath[step-1][0]!="NULL"){
		colorNode(bfspath[step-1][0],"blue");
		colorEdge(bfspath[step-1][0],bfspath[step-1][1],null);
	}
}

// =========== bfs end =============