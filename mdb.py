import psycopg2, typing
import psycopg2.extras, aiopg
import asyncio, sqlite3
import json, os

class DB:
    DB_URL = os.environ.get('DATABASE_URL', 'postgresql://jamesp:NOiMxLDRD3ra3QGrIxopS0XdJANBRxdZ@dpg-da2945rjan9c73a3icgg-a/genai_cf6h')
    def __init__(self, as_dict:bool = False) -> None:
        self.as_dict = as_dict

    def __enter__(self) -> 'DB':
        if self.as_dict:
            self.conn = psycopg2.connect(self.__class__.DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
        else:
            self.conn = psycopg2.connect(self.__class__.DB_URL)

        self.cur = self.conn.cursor()
        return self

    def __getattr__(self, attr:str) -> typing.Callable:
        def cur_method_wrapper(*args, **kwargs) -> typing.Any:
            match args:
                case (query, [*vals], *r):
                    vals = [psycopg2.extras.Json(i) if isinstance(i, (dict, list)) else i for i in vals]
                    return getattr(self.cur, attr)(query, vals, *r, **kwargs)
                case _:
                    return getattr(self.cur, attr)(*args, **kwargs)

        return cur_method_wrapper

    def __iter__(self) -> typing.Iterator:
        yield from self.cur

    def __next__(self) -> typing.Any:
        return next(self.cur)

    def commit(self) -> None:
        self.conn.commit()

    def __exit__(self, *_) -> None:
        self.cur.close()
        self.conn.close()

class aDB(DB):
    async def __aenter__(self) -> 'aDB':
        if self.as_dict:
            self.conn = await aiopg.connect(self.__class__.DB_URL, cursor_factory = psycopg2.extras.RealDictCursor)
        else:
            self.conn = await aiopg.connect(self.__class__.DB_URL)

        self.cur = await self.conn.cursor()

        return self

    async def __aiter__(self) -> typing.AsyncIterator:
        async for i in self.cur:
            yield i

    async def __anext__(self) -> typing.Any:
        try:
            return await anext(self.cur)

        except psycopg2.ProgrammingError:
            return None
        
    async def __aexit__(self, *_) -> None:
        self.cur.close()
        self.conn.close() 


class sqliteDB:
    DB_URL_GPT_4o_mini = '/Users/jamespetullo/sc_databases/sc_v.db'
    DB_URL_LLAMA8b = '/Users/jamespetullo/sc_databases/sc_v_llama8b.db'
    DB_URL_QWEN7b = '/Users/jamespetullo/sc_databases/sc_v_qwen7b.db'
    DB_URL_MISTRAL7b = '/Users/jamespetullo/sc_databases/sc_v_mistral7b.db'
    DB_URL_LLAMA70b = '/Users/jamespetullo/sc_databases/sc_v_llama70b.db'
    def __init__(self, DB_URL:str = None, as_dict = True) -> None:
        self.as_dict = as_dict
        self.conn = None
        self.cur = None
        self.DB_URL = DB_URL
        if self.DB_URL is None:
            self.DB_URL = self.__class__.DB_URL_LLAMA70b

    def __enter__(self):
        self.conn = sqlite3.connect(self.DB_URL)
        if self.as_dict:
            self.conn.row_factory = sqlite3.Row

        self.cur = self.conn.cursor()
        return self

    def execute(self, sql:str, row:list) -> None:
        row = [json.dumps(j) if isinstance(j, (dict, list)) else j for j in row]
        self.cur.execute(sql, row)

    def __iter__(self) -> typing.Iterator:
        for i in self.cur:
            d = {}
            for a, b in dict(i).items():
                try:
                    d[a] = json.loads(b)
                
                except:
                    d[a] = b
            
            yield d

    def commit(self) -> None:
        self.conn.commit()

    def __exit__(self, *_):
        self.conn.close()
    


if __name__ == '__main__':
    '''
    with sqliteDB() as conn:
        conn.execute('select * from problem_sc_responses limit 10', [])
        print([*conn][0]['resp'])
    '''

    
