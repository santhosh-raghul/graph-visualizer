// module.exports = (
// 	function ()
// 	{

// 		'use strict';

// 		function dfs(start, nodes, fn)
// 		{
// 				(
// 				function dfs_recur(node, visited)
// 				{
// 					var adj = nodes[node];
// 					visited.push(node);
// 					fn(node);
// 					for (var i in adj)
// 					{
// 						var node = adj[i];
// 						if (0 > visited.indexOf(node))
// 									dfs_recur(node, visited);
// 					}
// 				}
// 				)(start, []);
// 		};

// 	return dfs;

// 	})();

function dfs_trial(graph, node, visited)
{
	var neighbours = graph[node];
	visited.push(node);
	// fn(node);
	for (var s in neighbours)
	{
		var node = neighbours[s];
		if (!visited.includes(node))
					dfs_trial(graph, node, visited);
	}
}

function dfs(start)
{
	var graph = get_graph();
	var visited = [];
	dfs_trial(graph, start, visited);
	console.log(visited.join(', '));
}