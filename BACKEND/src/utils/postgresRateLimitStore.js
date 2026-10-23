'use strict';
const {createHmac}=require('node:crypto');
class PostgresRateLimitStore {
 constructor(db,secret,prefix){this.db=db;this.secret=secret;this.prefix=prefix;this.localKeys=false;this.lastCleanup=0;}
 init(options){this.windowMs=options.windowMs;}
 hash(key){return createHmac('sha256',this.secret).update(`${this.prefix}:${key}`).digest('hex');}
 async increment(key){
  const now=Date.now();
  if(now-this.lastCleanup>60000){this.lastCleanup=now;await this.db.query('DELETE FROM af_rate_limits WHERE reset_time < CURRENT_TIMESTAMP');}
  const {rows}=await this.db.query(`INSERT INTO af_rate_limits(key_hash,total_hits,reset_time)
   VALUES($1,1,CURRENT_TIMESTAMP+($2::double precision*INTERVAL '1 millisecond'))
   ON CONFLICT(key_hash) DO UPDATE SET
   total_hits=CASE WHEN af_rate_limits.reset_time<=CURRENT_TIMESTAMP THEN 1 ELSE af_rate_limits.total_hits+1 END,
   reset_time=CASE WHEN af_rate_limits.reset_time<=CURRENT_TIMESTAMP THEN EXCLUDED.reset_time ELSE af_rate_limits.reset_time END
   RETURNING total_hits,reset_time`,[this.hash(key),this.windowMs]);
  return {totalHits:rows[0].total_hits,resetTime:new Date(rows[0].reset_time)};
 }
 async decrement(key){await this.db.query('UPDATE af_rate_limits SET total_hits=GREATEST(0,total_hits-1) WHERE key_hash=$1',[this.hash(key)]);}
 async resetKey(key){await this.db.query('DELETE FROM af_rate_limits WHERE key_hash=$1',[this.hash(key)]);}
}
module.exports={PostgresRateLimitStore};
