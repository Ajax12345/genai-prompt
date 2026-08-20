import mdb

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


if __name__ == '__main__':
    Users.add_user(
        'James Petullo', 
        'jamespetullo@brandeis.edu', 
        'Gobronxbombers2'
    )

