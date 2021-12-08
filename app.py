#!/usr/bin/env python3

from re import M
from flask import Flask, render_template, request, redirect, send_from_directory, session
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = '12345678'

@app.route('/', methods=['GET','POST'])
def undirected_graph():

	graph = "<g id='edges'></g> <g id='nodes'></g>"

	if request.method == 'POST':
		files = request.files.getlist('graph_file')
		graph = files[0].read().decode('utf-8') if files else graph

	return render_template('draw_graph.html', title="Graph Visualizer", graph=graph)

if __name__ == '__main__':
	app.debug = True
	app.run(host="0.0.0.0",port=4000)
