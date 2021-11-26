// ethereum.autoRefreshOnNetworkChange = false;

var drag_element, svg, position, transform, node1, node2, current_edge, delete_edge, test, tree, weighted = false, edge_weight_being_updated = false;
var node_id = 0, node_circle_radius = "32px", background_color = document.getElementById("graph_area").getAttributeNS(null,"fill"), node_label_dy="16px";

// var wheelOpt = supportsPassive ? { passive: false } : false;

var visited, track, sub_path;
var i,j,u,v,u_prev,v_prev,edge,path,playing=false;

var prims_mst;

fetch('static/assets/help_message.txt').then(response => response.text()).then(text => document.getElementById("help").setAttribute('title',text));

function algo_select(algo)
{
	var sub_menu_elem = document.getElementById("sub_menu").children;
	for (var i=0; i<sub_menu_elem.length; i++) sub_menu_elem[i].remove();

	algo=algo.value;
	switch(algo)
	{
		case 'dfs': setup_dfs(); break;
		case 'bfs': setup_bfs(); break;
		case 'ccs': document.getElementById("run_button").onclick = show_connected_components; break;
		case 'tree_chk': document.getElementById("run_button").onclick = check_if_tree; break;
		case 'prims_min': setup_prims("min"); break;
		case 'prims_max': setup_prims("max"); break;
	}
}

function setup_prims(param)
{
	dd = put_select_node_dd("Choose staring node");
	document.getElementById("run_button").onclick = function()
		{
			var dfs_paths = get_dfs_paths(random_node());
			clear_opbox();
			if (dfs_paths.length == 1)
			{
				prims(dd.value,param);
			}
			else
				log("the graph is not connected")
		};
	document.getElementById("fwd_button").onclick = function() { prims_forward(); };
	document.getElementById("bwd_button").onclick = function() { prims_backward(); };

}

function setup_dfs()
{
	dd = put_select_node_dd("Choose staring node");
	document.getElementById("run_button").onclick = function() { dfs(dd.value); };
	document.getElementById("fwd_button").onclick = function() { dfs_forward(); };
	document.getElementById("bwd_button").onclick = function() { dfs_backward(); };
}

function put_select_node_dd(message)
{
	var dd = document.createElement("select"),op = document.createElement('option');
	dd.setAttribute('name','starting_node');
	op.value=''; op.innerHTML = message; op.disabled = true; op.selected = true; op.hidden = true; dd.appendChild(op);
	op = document.createElement('option');
	op.value=''; op.innerHTML = "random node"; dd.appendChild(op);
	var node_list = get_node_list();
	for (var i=0; i<node_list.length; i++)
	{
		op = document.createElement('option');
		op.value = node_list[i];
		op.innerHTML = node_list[i];
		dd.appendChild(op);
	}
	document.getElementById("sub_menu").appendChild(dd);
	return dd;
}

function setup_bfs()
{
	put_select_node_dd("Choose staring node");
	document.getElementById("run_button").onclick = function() { bfs(dd.value); };
	document.getElementById("fwd_button").onclick = function() { bfs_forward(); };
	document.getElementById("bwd_button").onclick = function() { bfs_backward(); };
	document.getElementById("play_button").onclick = function() { bfs_show(); };
}

function weighted_unweighted(a)
{
	var buttons = document.getElementsByClassName("w_uw");
	var weights = document.getElementsByClassName("edge_weight");
	if ( a.id=='unweighted_button' && weighted && ( !weights.length || confirm('All edge weights will be forgotten.') ) )
	{
		make_unweighted(true);
		weighted = false;
		buttons[0].classList.toggle("selected");
		buttons[1].classList.toggle("selected");
	}
	else if (a.id=='weighted_button' && !weighted)
	{
		make_weighted();
		weighted = true
		buttons[0].classList.toggle("selected");
		buttons[1].classList.toggle("selected");
	}
}

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
	svg.addEventListener('mousemove', continue_drawing_edge);	svg.addEventListener('touchmove', continue_drawing_edge);

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
			var node_text = drag_element.children[1];
			for (var i = 0; i < edges.length; i++)
			{
				edge = edges[i].id.split(" ");
				x1 = edges[i].children[0].getAttributeNS(null,"x1");
				y1 = edges[i].children[0].getAttributeNS(null,"y1");
				x2 = edges[i].children[0].getAttributeNS(null,"x2");
				y2 = edges[i].children[0].getAttributeNS(null,"y2");

				// x = coord.x;
				// y = coord.y;
				x = parseFloat(node_text.getAttributeNS(null,"x")) + parseFloat(coord.x) - parseFloat(position.x_offset);
				y = parseFloat(node_text.getAttributeNS(null,"y")) + parseFloat(coord.y) - parseFloat(position.y_offset);

				if(edge[0]==drag_element.id)
					move_edge(edges[i],x,y,x2,y2);
				else if(edge[1]==drag_element.id)
					move_edge(edges[i],x1,y1,x,y);
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
			if (evt.target.parentNode.id == "graph_area_main_svg" && !edge_weight_being_updated)
				create_node(evt);
			else if ( evt.target.parentNode.parentNode.id == "edges" && evt.target.nodeName == "text" && evt.which==1 )
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
		var node = evt.target.parentNode.children[1];
		current_edge = document.createElementNS(svgNS,"line");
		current_edge.setAttributeNS(null,"class","edge_main");

		var coord = getMousePosition(evt);
		position = { x: parseFloat(node.getAttributeNS(null,'x')) + parseFloat(coord.x) - parseFloat(position.x_offset), y: parseFloat(node.getAttributeNS(null,'y')) + parseFloat(coord.y) - parseFloat(position.y_offset) };

		current_edge.setAttributeNS(null,"x1",position.x);
		current_edge.setAttributeNS(null,"y1",position.y);
		current_edge.setAttributeNS(null,"x2",position.x);
		current_edge.setAttributeNS(null,"y2",position.y);

		document.getElementById("edges").appendChild(current_edge);
	}

	function continue_drawing_edge(evt)
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
	node_circle.classList.add("draggable","node_circle");
	// node_circle.setAttributeNS(null,"class","draggable node_circle");

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
	log(`node ${node_id} created`);
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
	if (!weighted)
		edge_weight.style.visibility = "hidden"

	edge.appendChild(tr_line);
	edge.appendChild(main_line);
	edge.appendChild(edge_weight);
	document.getElementById("edges").appendChild(edge);
}

function create_edge(evt)
{
	node1_id = node1.getAttributeNS(null,"id"); node2_id = node2.getAttributeNS(null,"id");
	var id = node1_id+" "+node2_id;
	var valid_edge = is_edge_valid(node1_id,node2_id);

	var coord = getMousePosition(evt);

	if(valid_edge)
	{
		var coords = {	x1 : parseFloat(current_edge.getAttributeNS(null,"x1")),
						y1 : parseFloat(current_edge.getAttributeNS(null,"y1")),
						x2 : parseFloat(node2.children[1].getAttributeNS(null,'x')) + parseFloat(coord.x) - parseFloat(position.x_offset),
						y2 : parseFloat(node2.children[1].getAttributeNS(null,'y')) + parseFloat(coord.y) - 
						parseFloat(position.y_offset)
					 };
		draw_edge(id,coords);
		log(`edge (${node1_id},${node2_id}) created`);
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
		edge.push(parseInt(edges[i].children[2].innerHTML));
		edge_list.push(edge);
	}
	return edge_list;
}

function remove_node(node)
{
	var label = node.id, c =0;
	node.remove();
	var edges = document.getElementById("edges").children;
	for (var i = 0; i < edges.length; i++)
	{
		edge = edges[i].id.split(" ");
		if ( (edge[0]==label) || (edge[1]==label) )
		{
			edges[i--].remove();
			c++;
		}
	}
	log(`node ${label} and ${c} edges deleted`);
}

function remove_edge(edge)
{
	var e = edge.id.split(' ');
	log(`edge (${e}) deleted`);
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

	return graph;
}

function update_edge_weight(edge)
{
	edge_weight_being_updated = true
	var done=false;
	edge.children[2].style.visibility = "hidden";

	var x1 = parseFloat(edge.children[0].getAttributeNS(null,"x1"));
	var y1 = parseFloat(edge.children[0].getAttributeNS(null,"y1"));
	var x2 = parseFloat(edge.children[0].getAttributeNS(null,"x2"));
	var y2 = parseFloat(edge.children[0].getAttributeNS(null,"y2"));
	var angle = Math.atan((y2-y1)/(x2-x1))*180/Math.PI;
	var l = Math.sqrt( (x1-x2)**2 + (y1-y2)**2 )

	x_=x1;
	y_=y1;
	if (x1>x2) { x1=x2; y1=y2;}
	if (x2<x_) { x2=x_; y2=y_;}

	var svg = document.getElementById("graph_area_main_svg");
	var foreign_obj = document.createElementNS(svgNS,"foreignObject");
	foreign_obj.setAttributeNS(null,"x",x1);
	foreign_obj.setAttributeNS(null,"y",y1);
	foreign_obj.setAttributeNS(null,"width",l);
	foreign_obj.setAttribute('transform',`rotate(${angle},${x1},${y1})`);
	foreign_obj.setAttribute('overflow','visible');

	var ip = document.createElement("input");
	ip.setAttribute('type','number');
	ip.setAttribute('class',"edge_weight_input");
	ip.setAttribute('value',edge.children[2].innerHTML);
	resize_input();

	ip.addEventListener('input', resize_input);
	ip.addEventListener('focusout',check_weight);
	ip.addEventListener('keyup',check_weight);

	foreign_obj.appendChild(ip);
	svg.appendChild(foreign_obj);
	ip.focus();
	ip.select();

	function resize_input() { ip.style.width = (ip.value.length + 1) + "ch"; }

	function check_weight(evt)
	{
		if (evt.type=='keyup')
		{
			if (evt.key=="Enter")
			{
				finalise_weight();
				done = true;
			}
			else if (evt.key=="Escape")
			{
				done=true;
				foreign_obj.remove();
				edge.children[2].style.visibility = "visible";
			}
		}
		else if(!done)
			finalise_weight();
	}

	async function finalise_weight()
	{
		if (ip.value==parseInt(ip.value))
		{
			edge.children[2].innerHTML = ip.value;
			var e = edge.id.split(' ');
			log(`weight of edge (${e}) was set to ${ip.value}`);
		}
		else
			log('invalid edge weight');
		foreign_obj.remove();
		edge.children[2].style.visibility = "visible";
		await sleep(100);
		edge_weight_being_updated = false;
	}

}

// function update_edge_weight(edge)
// {
// 	edge.children[2].style.visibility = "hidden";

// 	var x1 = parseFloat(edge.children[0].getAttributeNS(null,"x1"));
// 	var y1 = parseFloat(edge.children[0].getAttributeNS(null,"y1"));
// 	var x2 = parseFloat(edge.children[0].getAttributeNS(null,"x2"));
// 	var y2 = parseFloat(edge.children[0].getAttributeNS(null,"y2"));
// 	// var angle = Math.atan((y2-y1)/(x2-x1))*180/Math.PI;
// 	// var l = Math.sqrt( (x1-x2)**2 + (y1-y2)**2 )

// 	x_=x1;
// 	y_=y1;
// 	if (x1>x2) x1=x2;
// 	if (x2<x_) x2=x_;
// 	if (y1>y2) y1=y2;
// 	if (y2<y_) y2=y_;

// 	var svg = document.getElementById("graph_area_main_svg");
// 	var foreign_obj = document.createElementNS(svgNS,"foreignObject");
// 	foreign_obj.setAttributeNS(null,"x",x1);
// 	foreign_obj.setAttributeNS(null,"y",y1);
// 	foreign_obj.setAttributeNS(null,"width",x2-x1);
// 	foreign_obj.setAttributeNS(null,"height",y2-y1);
// 	foreign_obj.setAttribute('overflow','visible');

// 	var ip = document.createElement("input");
// 	ip.setAttribute('type','number');
// 	ip.setAttribute('class',"edge_weight_input");
// 	ip.setAttribute('value',edge.children[2].innerHTML);
// 	resize_input();

// 	// ip.addEventListener('input', resize_input);
// 	// ip.addEventListener('focusout',check_weight);
// 	// ip.addEventListener('keyup',check_weight);

// 	foreign_obj.appendChild(ip);
// 	svg.appendChild(foreign_obj);
// 	ip.focus();
// 	ip.select();

// 	function resize_input() { ip.style.width = (ip.value.length + 1) + "ch"; }

// 	function check_weight(evt)
// 	{
// 		if (evt.type=='keyup')
// 		{
// 			if (evt.key=="Enter")
// 				finalise_weight();
// 			else if (evt.key=="Escape")
// 				foreign_obj.remove();
// 		}
// 		else
// 			finalise_weight();
// 	}

// 	function finalise_weight()
// 	{
// 		if (ip.value==parseInt(ip.value))
// 			edge.children[2].innerHTML = ip.value;
// 		foreign_obj.remove();
// 		edge.children[2].style.visibility = "visible";
// 		console.log("finalize");
// 	}

// }

function reset_graph_appearance()
{
	var nodes = document.getElementById("nodes").children, edges = document.getElementsByClassName("edge_bg");
	for (var i =0; i<nodes.length; i++) nodes[i].children[0].style.fill = background_color;
	for (var i =0; i<edges.length; i++) edges[i].style.stroke = "rgba(0,0,0,0)";
}


function make_unweighted(forget)
{
	var weights = document.getElementsByClassName("edge_weight");
	for (var i=0; i<weights.length; i++) weights[i].style.visibility = "hidden";
	if (forget) for (var i=0; i<weights.length; i++) weights[i].innerHTML = 1;
	if (weights.length) log('all edge weights were removed');
}

function make_weighted()
{
	var weights = document.getElementsByClassName("edge_weight");
	for (var i=0; i<weights.length; i++) weights[i].style.visibility = "visible";
	if (weights.length) log('all edge weights were set to 1');
}

// ================== dfs =======================

function dfs_util(graph, node)
{
	var neighbours = graph[node], c=0;
	visited.push(parseInt(node));
	sub_path.push([node,"v"]);

	for (var i = 0; i < neighbours.length; i++)
	{
		var neighbour = neighbours[i];
		if ( visited.includes( parseInt(neighbour) ) )
		{
			c++;
			if (c>1)
				tree = false;
		}
		else
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
	tree=true;

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
	reset_graph_appearance();
	path = get_dfs_paths(starting_node);

	i_max = path.length-1;
	j_max = path[0].length-1;
}

function dfs_forward()
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

function dfs_backward()
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
	// if ( !path || !path.length ) return;

	if (! playing)
	{
		playing = true;
		disable_drawing();
		var bwd = document.getElementById("bwd_button");
		var fwd = document.getElementById("fwd_button");
		var run = document.getElementById("run_button");
		var play = document.getElementById("play_button");
		play.innerHTML = "stop";

		fwd_fn = fwd.onclick;

		bwd.disabled = true; fwd.disabled = true; run.disabled = true;
		while(i!="end" && playing)
		{
			fwd_fn();
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

var bfspath, levels, step;
async function bfs_of_component(node)
{

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
		// console.log(ele,q);
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
	// console.log(bfspath);
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

		}
		else{
			if(bfspath[step-1][0]!="NULL"){
				colorNode(bfspath[step-1][0],"orange");
				colorEdge(bfspath[step-1][0],bfspath[step-1][1],"yellow");
			}
			if(ele!=bfspath[step-1][0])
				colorNode(ele,"blue");
			colorNode(neighbour,null);
			colorEdge(ele,neighbour,null);

		}
	}
}

async function bfs_forward()
{
	if(step<bfspath.length){
		var ele = bfspath[step][0];
		var neighbour = bfspath[step][1];
		if(step>1){
			colorNode(bfspath[step-1][1],"blue");
		}
		if(ele=="NULL"){
			if(step>=1 && bfspath[step-1][0]!="NULL"){
				colorNode(bfspath[step-1][0],"blue");
				colorEdge(bfspath[step-1][0],bfspath[step-1][1],null);
			}
			colorNode(neighbour,"yellow");
		}
		else{
			if(bfspath[step-1][0]!="NULL"){
				colorNode(bfspath[step-1][0],"blue");
				colorEdge(bfspath[step-1][0],bfspath[step-1][1],null);
			}
			colorNode(ele,"orange");
			colorNode(neighbour,"yellow");
			colorEdge(ele,neighbour,"yellow");
		}
		step++;
	}
	else{
		if(step>=1 && bfspath[step-1][0]!="NULL"){
			colorNode(bfspath[step-1][0],"blue");
			colorEdge(bfspath[step-1][0],bfspath[step-1][1],null);
		}
		if(step>1)
			colorNode(bfspath[step-1][1],"blue");
	}
}

async function bfs_show()
{
	while(step<bfspath.length){
		bfs_forward();
		await sleep(1000);
	}
	if(step>=1 && bfspath[step-1][0]!="NULL"){
		colorNode(bfspath[step-1][0],"blue");
		colorNode(bfspath[step-1][1],"blue");
		colorEdge(bfspath[step-1][0],bfspath[step-1][1],null);
	}
}

// =========== bfs end =============

// =========== prim's ==============

function prims(node, param)
{

	cond = (param == 'min') ? function(a,b) { return a<=b; } : function(a,b) { return a>=b; };

	reset_graph_appearance();
	var graph = get_graph(), visited = [], n=0;
	prims_mst = [];
	graph.forEach(node => n++);

	if (parseInt(node)!=node)
	{
		console.log('invalid starting node');
		// PHALANGE
	}

	var reachable_edges = [], min_edge, edge, neighbours;
	graph[node].forEach(neighbour => reachable_edges.push([node,neighbour[0],neighbour[1]]));
	visited.push(parseInt(node));

	while (visited.length!=n)
	{
		min_edge = reachable_edges[0];
		for (const i in reachable_edges )
		{
			edge = reachable_edges[i];
			if (!visited.includes(parseInt(edge[1])))
			{
				min_edge=edge;
				break;
			}
		}
		for (const i in reachable_edges )
		{
			edge = reachable_edges[i];
			if( !visited.includes(parseInt(edge[1])) && cond(edge[2],min_edge[2]) )
				min_edge=edge;
		}
		visited.push(parseInt(min_edge[1]));
		neighbours = graph[min_edge[1]];
		for ( const i in neighbours )
		{
			neighbour = neighbours[i];
			reachable_edges.push([min_edge[1],neighbour[0],neighbour[1]]);
		}
		prims_mst.push([min_edge[0],min_edge[1]]);
	}

	i=0; j=-1; u=null; v=null; u_prev=null; v_prev=null; sub_path=null; edge=null; path=null;
	j_max=prims_mst.length-1
	colorNode(node,"blue");
}

async function prims_forward()
{
	j++;
	if ( !prims_mst || !prims_mst.length ) return;
	if (j>j_max) { j=j_max; return;}

	if (j>0)
	{
		colorEdge(prims_mst[j-1][0],prims_mst[j-1][1],"red");
		colorNode(prims_mst[j-1][1],"blue");
	}

	colorNode(prims_mst[j][1],"yellow");
	colorEdge(prims_mst[j][0],prims_mst[j][1],"yellow");

	if (j==j_max)
	{
		await sleep(750);
		colorEdge(prims_mst[j][0],prims_mst[j][1],"red");
		colorNode(prims_mst[j][1],"blue");
		i="end";
	}

}

async function prims_backward()
{
	j--;

	if ( !prims_mst || !prims_mst.length ) return;
	if (j<-1) { j=-1; return;}

	if (j>=0)
	{
		colorEdge(prims_mst[j][0],prims_mst[j][1],"yellow");
		colorNode(prims_mst[j][1],"yellow");
	}

	colorEdge(prims_mst[j+1][0],prims_mst[j+1][1],null);
	colorNode(prims_mst[j+1][1],null);

}

async function prims_play()
{
	if ( !prims_mst || !prims_mst.length ) return;

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
			prims_forward();
			await sleep(1000);
		}
		play.innerHTML = "play";
		bwd.disabled = false; fwd.disabled = false; run.disabled = false;
		enable_drawing();
	}
	else
		playing = false;
}

// =========== prim's end ==============

function get_connected_components()
{
	var dfs_paths = get_dfs_paths(random_node()), ccs = [], comp = [];

	for (var i=0; i<dfs_paths.length; i++)
	{
		comp=[];

		for (var j=0; j<dfs_paths[i].length; j++)
			if (dfs_paths[i][j][1]=='v') comp.push(dfs_paths[i][j][0]);

		ccs.push(comp);
	}

	return ccs;
}

function show_connected_components()
{
	var ccs = get_connected_components();
	var colors = n_random_colors(ccs.length);
	for (var i=0; i<ccs.length; i++)
	{
		for(var j=0; j<ccs[i].length; j++)
			colorNode(ccs[i][j],colors[i]);
	}
	clear_opbox();
	if (ccs.length == 1)
		log("the graph is connected");
	else
		log(`number of connected components = ${ccs.length}`)
}

function check_if_tree()
{
	var dfs_paths = get_dfs_paths(random_node());

	clear_opbox();
	if (dfs_paths.length == 1 && tree)
		log("the graph is a tree");
	else
		log("the graph is not a tree")
}

function n_random_colors(n)
{
	var h=0,s,l, step = 360/parseFloat(n),colors = [];
	h = Math.random() * 360;
	for (var i=0; i<n; i++)
	{
		s = 30 + Math.random()*70;
		l = 40 + Math.random()*40;
		colors.push(`hsl(${h},${s}%,${l}%)`);
		h+=step;
		h%=360;
	}
	return colors;
}

function random_node()
{
	// PHALANGE
	return 1;
}

function log(message)
{
	var a = document.getElementById("output_box");
	a.innerHTML = a.innerHTML+message.toString()+';\n';
	a.scroll(0,a.scrollHeight);
}

function clear_opbox()
{
	document.getElementById("output_box").innerHTML = '';
}

function make_print_area(argument)
{
	document.getElementById("print_area").style.visibility = argument;
}