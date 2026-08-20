import mdb, uuid

class PromptSave:
    '''
    CREATE TABLE prompts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        student_email text NOT NULL,
        data jsonb,
        added timestamptz NOT NULL DEFAULT now()
    );
    '''

    @classmethod
    def save_prompt_submission(cls, payload:dict) -> dict:
        with mdb.DB(as_dict=True) as db:
            db.execute('insert into prompts (student_email, data) values (%s, %s)', 
                [
                    payload['student_email'],
                    payload,
                ]
            )
            db.commit()

        return {'success': True}

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
    def get_courses(cls, user_id:str) -> dict:
        with mdb.DB(as_dict=True) as db:
            db.execute(
                '''
                select jsonb_build_object(
                    'course_id', c.id
                ) || c.data || jsonb_build_object(
                    'assignments', (
                        select jsonb_agg(
                            jsonb_build_object(
                                'assignment_id', a.id
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

            courses = [i['course_obj'] for i in db]

        return {
            'has_courses': bool(courses),
            'courses': courses
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
                insert into assignments (id, data) values (
                    %s, %s
                )
            ''', [assignment_id, payload])

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
