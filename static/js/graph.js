// ethereum.autoRefreshOnNetworkChange = false;

var drag_element, svg, position, transform, u, v, current_edge, delete_edge, test;
var node_id = 22, node_circle_radius = "8px", background_color = "white", node_label_font_size="12px", node_label_dy="4px";

var visited, track, sub_path;
var i,j,u,v,u_prev,v_prev,sub_path,edge,path,prev_edge_color,prev_node_color;

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
	svg.addEventListener('mousemove', draw_edge);	svg.addEventListener('touchmove', draw_edge);

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
			if(u)
			{
				v = drag_element;
				create_edge(evt);
			}
			else
			{
				u = drag_element;
				if (evt.which === 3)
				{
					drag_element = null;
					remove_node(u);
					u = null;
				}
				else
					start_drawing_edge(evt);
			}
			drag_element = null;
		}
		else if (evt.type != "mouseleave" && evt.type!="touchleave" && evt.type!="touchcancel" && close(position,getMousePosition(evt)) && !current_edge)
			create_node(evt);
		else if (current_edge)
		{
			current_edge.remove();
			current_edge = null;
			u = null;
			v = null;
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

	function draw_edge(evt)
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

function create_node(evt)
{
	if (evt.which === 3)
	return;

	evt.preventDefault();
	var coord = getMousePosition(evt);
	
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
	node_id+=1;
}

function create_edge(evt)
{
	u = u.getAttribute("id");
	v = v.getAttribute("id");
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
	if(valid_edge)
	{
		var edge = document.createElementNS(svgNS,"g");

		main_line = current_edge;
		tr_line = document.createElementNS(svgNS,"line"); tr_line.setAttributeNS(null,"class","edge_bg");
		
		position = getMousePosition(evt);

		tr_line.setAttributeNS(null,"x1",main_line.getAttributeNS(null,"x1"));
		tr_line.setAttributeNS(null,"y1",main_line.getAttributeNS(null,"y1"));
		tr_line.setAttributeNS(null,"x2",main_line.getAttributeNS(null,"x2"));
		tr_line.setAttributeNS(null,"y2",main_line.getAttributeNS(null,"y2"));

		edge.appendChild(tr_line);
		edge.appendChild(main_line);
		document.getElementById("edges").appendChild(edge);
		edge.setAttributeNS(null,"id",id);
	}
	else
		current_edge.remove();
	current_edge = null;
	u = null;
	v = null;
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
	var edges = document.getElementById("edges").children;
	var edge_list = [];
	for (var i = 0; i < edges.length; i++)
	{
		edge_list.push(edges[i].id.split(" "));
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
	edge.children[0].setAttributeNS(null,"x1",x1);
	edge.children[0].setAttributeNS(null,"y1",y1);
	edge.children[0].setAttributeNS(null,"x2",x2);
	edge.children[0].setAttributeNS(null,"y2",y2);

	edge.children[1].setAttributeNS(null,"x1",x1);
	edge.children[1].setAttributeNS(null,"y1",y1);
	edge.children[1].setAttributeNS(null,"x2",x2);
	edge.children[1].setAttributeNS(null,"y2",y2);
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
		graph[edges[i][0]].push(edges[i][1]);
		graph[edges[i][1]].push(edges[i][0]);
	}
	
	return graph;
}

// =========================================================

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
	var graph = get_graph();
	var path = [];
	visited = [];
	for (const node in graph)
		colorNode(node, background_color);
	
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

async function dfs(starting_node)
{
	i=0; j=-1; u=null; v=null; u_prev=null; v_prev=null; sub_path=null; edge=null; path=null; prev_edge_color=null; prev_node_color=null;
	path = get_dfs_paths(starting_node);

	i_max = path.length-1;
	j_max = path[0].length-1;
	
	// for (var i = 0; i < path.length; i++)
	// {
	// 	sub_path = path[i];
	// 	for (var j = 0; j < sub_path.length; j++)
	// 	{
	// 		edge = sub_path[j]; v = edge[0];
	// 		await set_state(u,v,edge[1]);
	// 		u = v;
	// 	}
	// }
}
	
function forward()
{
	j++;

	if ( !path || !path.length ) return;
	if (j>j_max) { i++; j=0; if (i<i_max) j_max=path[i].length-1;}
	if (i>i_max) { i="end" }
	if ( i=="end" ) { if (v_prev) { colorNode(v_prev,"blue"); if (u_prev) colorEdge(u_prev,v_prev,null); } return; }

	if (v_prev) { colorNode(v_prev,"blue"); if (u_prev) colorEdge(u_prev,v_prev,null); }
	
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
	if (j<j_max) colorNode(v,path[i][j+1][1]=="b"?"blue":null);

	if (j==-1) return;

	u = (j-1)>=0 ? path[i][j-1][0] : null;
	v = path[i][j][0];
	set_state(u,v,path[i][j][1]);
	u_prev = u; v_prev = v;
}

async function play()
{
	if ( !path || !path.length ) return;

	var bwd = document.getElementById("bwd");
	var fwd = document.getElementById("fwd");
	var run = document.getElementById("run");
	var play = document.getElementById("play");

	bwd.disabled = true; fwd.disabled = true; run.disabled = true; play.disabled = true;
	while(i!="end") { forward(); 
		await sleep(1000); 
	}
	bwd.disabled = false; fwd.disabled = false; run.disabled = false; play.disabled = false;
}

function colorNode(node,color)
{
	color = color ? color : background_color;
	prev_node_color = document.getElementById(node).children[0].style.fill;
	document.getElementById(node).children[0].style.fill = color;
}

function colorEdge(u,v,color)
{
	color = color ? color : "rgba(0,0,0,0)";
	var edge = document.getElementById(u+" "+v) ? document.getElementById(u+" "+v) : document.getElementById(v+" "+u);
	prev_edge_color = edge.children[0].style.stroke;
	edge.children[0].style.stroke = color;
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

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
