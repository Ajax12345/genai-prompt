import flask, json
import app_handlers
import functools
import random, string
from typing import (
    Callable,
    Any
)

app = flask.Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.secret_key = ''.join(random.choice(string.ascii_letters+string.digits) for _ in range(20))

def is_loggedin(f:Callable) -> Callable:
    @functools.wraps(f)
    def wrapper(*args, **kwargs) -> Any:
        if flask.session.get('user', None) is None:
            return flask.redirect('/instructor/login')

        return f(*args, **kwargs)

    return wrapper


@app.route('/', methods = ['GET'])
def home() -> str:
    if flask.session.get('user', None) is None:
        return flask.redirect('/prompt')

    return flask.redirect('/instructor/dashboard')

@app.route('/prompt', methods = ['GET'])
def prompt_submit() -> str:
    return flask.render_template('index.html')


@app.route('/api/prompts', methods = ['POST'])
def api_prompts() -> dict:
    resp = app_handlers.PromptSave.save_prompt_submission(
        flask.request.get_json()
    )

    return flask.jsonify(resp)

@app.route('/instructor/login', methods = ['GET'])
def instructor_login() -> str:
    if flask.session.get('user', None) is not None:
        return flask.redirect('/instructor/dashboard')

    return flask.render_template('login.html')

@app.route('/api/instructor/login', methods = ['POST'])
def api_instructor_login() -> tuple:
    resp = app_handlers.Users.validate_login(
        flask.request.get_json()
    )

    if resp['status']:
        flask.session.clear()
        flask.session['user'] = resp['payload']
        flask.session.permanent = True

        return flask.jsonify({"status": "ok"}), 200

    return flask.jsonify({"error": resp['message']}), 401

@app.route('/api/instructor/new-course', methods = ['POST'])
def api_instructor_new_course() -> tuple:
    resp = app_handlers.Courses.create_course(
        flask.session['user']['id'],
        flask.request.get_json()
    )
    return flask.jsonify(resp)

@app.route('/api/instructor/new-assignment', methods = ['POST'])
def api_instructor_new_assignment() -> tuple:
    resp = app_handlers.Assignments.create_assignment(
        flask.session['user']['id'],
        flask.request.get_json()
    )
    return flask.jsonify(resp)

@app.route('/instructor/dashboard', methods = ['GET'])
@is_loggedin
def instructor_dashboard() -> str:
    course_id = flask.request.args.get('course')
    assignment_id = flask.request.args.get('assignment')
    return flask.render_template(
        'dashboard.html',
        user = flask.session['user']['data'],
        side_bar_data = app_handlers.Courses.get_courses(
            flask.session['user']['id'],
            flask.request.host_url,
            course_id = course_id,
            assignment_id = assignment_id
        ),
    )

@app.route('/instructor/logout', methods = ['GET'])
def instructor_logout() -> str:
    flask.session.clear()
    return flask.redirect('/')

'''
@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    r.headers.add('Access-Control-Allow-Origin', '*')
    r.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    r.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return r

'''

if __name__ == '__main__':
    app.debug = True
    app.run()