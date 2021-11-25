#!/usr/bin/env python3

from flask import Flask, render_template, request, redirect, send_from_directory, session
import os
# from wtforms.fields.core import FloatField, StringField
# from flask_wtf import FlaskForm
# from wtforms import IntegerField, SubmitField
# import json
# import shutil
# from forms import *

app = Flask(__name__)
app.config['SECRET_KEY'] = '12345678'

@app.route('/test')
def test():
	return render_template('draw_graph.html', title="test")

@app.route('/')
def stack_and_queue():
	return render_template('stack_and_queue.html', title="test")

if __name__ == '__main__':
	app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
	app.debug = True
	app.run(host="0.0.0.0",port=4000)