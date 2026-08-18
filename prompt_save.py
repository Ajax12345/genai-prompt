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


if __name__ == '__main__':
    with mdb.DB(as_dict=True) as db:
        db.execute('select p.* from prompts p')
        print([*db])
