#!/usr/bin/env python3

from flask import Flask, render_template, request, redirect, send_from_directory, session
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = '12345678'

@app.route('/')
def undirected_graph():
	return render_template('draw_graph.html', title="Graph Visualizer")

if __name__ == '__main__':
	app.debug = True
	app.run(host="0.0.0.0",port=4000)