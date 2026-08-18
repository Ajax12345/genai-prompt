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

if __name__ == '__main__':
    with mdb.DB(as_dict=True) as db:
        db.execute('select p.* from prompts p')
        print([*db])
