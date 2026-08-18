import flask, json
import prompt_save


app = flask.Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True


@app.route('/', methods = ['GET'])
def home() -> str:
    return flask.render_template('index.html')

@app.route('/api/prompts', methods = ['POST'])
def api_prompts() -> dict:
    resp = prompt_save.PromptSave.save_prompt_submission(
        flask.request.get_json()
    )

    return flask.jsonify(resp)

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