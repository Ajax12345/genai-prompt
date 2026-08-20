import mdb, uuid
import urllib.parse
import math
from datetime import datetime

class PromptSave:
    '''
    CREATE TABLE prompts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        student_email text NOT NULL,
        assignment uuid,
        data jsonb,
        added timestamptz NOT NULL DEFAULT now()
    );
    '''

    @classmethod
    def save_prompt_submission(cls, payload:dict) -> dict:
        print('save prompt submission')
        print(payload)
        with mdb.DB(as_dict=True) as db:
            db.execute('insert into prompts (student_email, assignment, data) values (%s, %s, %s)', 
                [
                    payload['student_email'],
                    payload['assignment_id'],
                    payload,
                ]
            )
            db.commit()

        return {'success': True}

    @classmethod
    def meta(cls, assignment_id:str) -> dict:
        with mdb.DB(as_dict=True) as db:
            db.execute('''
                select jsonb_build_object(
                    'assignment_name', a.data->> 'name',
                    'course_name', c.data ->> 'name'
                ) data
                from assignments a
                join courses c on c.id = a.course
                where a.id = %s
            ''', [assignment_id])

            return db.fetchone()['data']

class Users:
    '''
    create table users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        data jsonb,
        added timestamptz NOT NULL DEFAULT now()
    );
    '''
    @classmethod
    def validate_login(cls, payload:dict) -> dict:
        print(payload)
        with mdb.DB(as_dict = True) as db:
            db.execute('''
            select u.* from users u where u.data ->>'email' = %s and u.data ->> 'password' = %s
            ''', [payload['email'], payload['password']])

            result = [*db]



        if result:
            return {
                'status': True,
                'payload': result[0],
            }

        with mdb.DB(as_dict = True) as db:
            db.execute('''
            select exists (select 1 from users u where u.data ->> 'email' = %s) has_email
            ''', [payload['email']])
            result = db.fetchone()

        if result['has_email']:
            return {
                'status': False,
                'message': 'Password is incorrect.',
            }

        return {
            'status': False,
            'message': 'Email not found.',
        }

    @classmethod
    def add_user(cls, name:str, email:str, password:str) -> None:
        '''
        Insert a new user into the users table, storing name, email, and
        password together as the row's jsonb data.
        '''

        with mdb.DB(as_dict=True) as db:
            db.execute('''
                insert into users (data) values (
                    jsonb_build_object(
                        'name', %s,
                        'email', %s,
                        'password', %s
                    )
                )
            ''', [name, email, password])

            db.commit()

class Courses:
    '''
    create table courses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid,
        data jsonb,
        added timestamptz NOT NULL DEFAULT now()
    );
    '''
    @classmethod
    def create_course(cls, user_id:str, payload:dict) -> dict:
        course_id = str(uuid.uuid4())
        with mdb.DB(as_dict=True) as db:
            db.execute('''
                insert into courses (id, user_id, data) values (
                    %s, %s, %s
                )
            ''', [course_id, user_id, payload])

            db.commit()

        return {'course_id': course_id}

    @classmethod
    def get_courses(
        cls, 
        user_id:str, 
        host_url:str,
        course_id:str = None, 
        assignment_id:str = None) -> dict:

        with mdb.DB(as_dict=True) as db:
            db.execute(
                '''
                select jsonb_build_object(
                    'course_id', c.id
                ) || c.data || jsonb_build_object(
                    'assignments', (
                        select jsonb_agg(
                            jsonb_build_object(
                                'assignment_id', a.id,
                                'submissions', (
                                    select jsonb_agg(
                                        p.data || jsonb_build_object(
                                            'added', p.added
                                        )
                                    ) 
                                    from prompts p
                                    where p.assignment = a.id
                                ),
                                'added', a.added
                            ) || a.data
                        ) from assignments a
                        where a.course = c.id
                    )
                ) course_obj
                from courses c 
                where c.user_id = %s
                order by c.added desc
                ''', [user_id]
            )

            _courses = [i['course_obj'] for i in db]

        chosen_assignment = None
        chosen_course = None
        courses = []
        for c_i, course in enumerate(_courses):
            assignments = []
            for a_i, a in enumerate(sorted(course['assignments'] or [], key=lambda x:x['added'])):
                p = {
                    **a,
                    'is_active': 'is-active' if a['assignment_id'] == assignment_id or (assignment_id is None and not c_i and not a_i) else ''
                }

                p['submitted_text'] = f'{(T:=len(a["submissions"] or []))} Submission{"" if T == 1 else "s"}'

                if p['is_active'] == 'is-active':
                    chosen_assignment = p
                    chosen_course = course

                assignments.append(p)

            courses.append({**course, 'assignments': assignments})

        print(chosen_assignment)

        if chosen_assignment:
            chosen_assignment['submission_link'] = urllib.parse.urljoin(
                host_url,
                f'/prompt/{chosen_assignment["assignment_id"]}'
            )

            chosen_assignment['total_submissions'] = len(chosen_assignment['submissions'] or [])
            chosen_assignment['total_submissions_text'] = f'Submission{"s" if chosen_assignment['total_submissions'] != 1 else ""} received'
            submissions = []
            is_ai, not_ai = 0, 0
            for submission in chosen_assignment['submissions'] or []:
                if submission['used_ai']:
                    is_ai += 1
                else:
                    not_ai += 1

                dt = datetime.fromisoformat(submission['added'])

                submissions.append({
                    'email': submission['student_email'],
                    'timestamp': dt.strftime('%b %-d, %Y \u00b7 %-I:%M %p'),
                    'used_ai': submission['used_ai'],
                })

            chosen_assignment['is_ai'] = is_ai
            chosen_assignment['not_ai'] = not_ai
            chosen_assignment['percentage'] = round((is_ai/(is_ai + not_ai or 1))*100, 0)
            chosen_assignment['offset'] = math.pi * 70 * (1 - (is_ai/(is_ai + not_ai or 1)))
            chosen_assignment['submissions'] = submissions

        return {
            'has_courses': bool(courses),
            'courses': courses,
            'has_selected_assignment': bool(chosen_assignment),
            'assignment': chosen_assignment,
            'course': chosen_course,
        }


class Assignments:
    '''
    create table assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        course uuid,
        data jsonb,
        added timestamptz NOT NULL DEFAULT now()
    );
    '''
    @classmethod
    def create_assignment(cls, user_id:str, payload:dict) -> dict:
        assignment_id = str(uuid.uuid4())
        with mdb.DB(as_dict=True) as db:
            db.execute('''
                insert into assignments (id, course, data) values (
                    %s, %s, %s
                )
            ''', [assignment_id, payload['course_id'], payload])

            db.commit()
            
        return {
            'course_id': payload['course_id'],
            'assignment_id': assignment_id
        }

if __name__ == '__main__':
    '''
    Users.add_user(
        'James Petullo', 
        'jamespetullo@brandeis.edu', 
        'Gobronxbombers2'
    )
    '''
    print(Courses.get_courses('fb22220c-bb47-4fa6-bbbb-1f64b962208a'))
