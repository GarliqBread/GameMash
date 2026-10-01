import { type CommandParser, defineScript, type RedisArgument } from "redis";

const luaScript = <Reply>(numberOfKeys: number, script: string) =>
  defineScript({
    NUMBER_OF_KEYS: numberOfKeys,
    SCRIPT: script,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => {
      parser.pushKeys(keys);
      parser.push(...args);
    },
    transformReply: undefined as unknown as () => Reply,
  });

const luaScriptOverKeys = <Reply>(script: string) =>
  defineScript({
    SCRIPT: script,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => {
      parser.pushKeysLength(keys);
      parser.push(...args);
    },
    transformReply: undefined as unknown as () => Reply,
  });

export const sessionScripts = {
  createSession: luaScript<number>(
    2,
    `
if not redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PXAT', ARGV[2]) then return 0 end
redis.call('HSET', KEYS[2], unpack(ARGV, 3))
redis.call('PEXPIREAT', KEYS[2], ARGV[2])
return 1`,
  ),
  addPlayer: luaScript<string>(
    3,
    `
if redis.call('EXISTS', KEYS[1]) == 0 then return 'session_not_found' end
if redis.call('HLEN', KEYS[2]) >= tonumber(ARGV[4]) then return 'session_full' end
if redis.call('HSETNX', KEYS[3], ARGV[3], ARGV[1]) == 0 then return 'name_taken' end
redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
redis.call('PEXPIREAT', KEYS[1], ARGV[5])
redis.call('PEXPIREAT', KEYS[2], ARGV[5])
redis.call('PEXPIREAT', KEYS[3], ARGV[5])
return 'added'`,
  ),
  removePlayer: luaScript<string>(
    5,
    `
local status = redis.call('HGET', KEYS[1], 'status')
if not status then return 'session_not_found' end
if status ~= 'lobby' then return 'locked' end
if redis.call('HDEL', KEYS[2], ARGV[1]) == 0 then return 'player_not_found' end
if redis.call('HGET', KEYS[3], ARGV[2]) == ARGV[1] then redis.call('HDEL', KEYS[3], ARGV[2]) end
redis.call('HDEL', KEYS[4], ARGV[1])
redis.call('HDEL', KEYS[5], ARGV[1])
redis.call('PEXPIREAT', KEYS[1], ARGV[3])
return 'removed'`,
  ),
  setSessionStatus: luaScript<number>(
    1,
    `
if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
redis.call('HSET', KEYS[1], 'status', ARGV[1])
return 1`,
  ),
  setAvatar: luaScript<string>(
    4,
    `
local status = redis.call('HGET', KEYS[1], 'status')
if not status then return 'session_not_found' end
if status ~= 'lobby' then return 'locked' end
if redis.call('HEXISTS', KEYS[2], ARGV[1]) == 0 then return 'player_not_found' end
redis.call('HSET', KEYS[3], ARGV[1], ARGV[2])
redis.call('HSET', KEYS[4], ARGV[1], ARGV[3])
redis.call('PEXPIREAT', KEYS[1], ARGV[4])
redis.call('PEXPIREAT', KEYS[3], ARGV[4])
redis.call('PEXPIREAT', KEYS[4], ARGV[4])
return 'saved'`,
  ),
  removeAvatar: luaScript<string>(
    4,
    `
local status = redis.call('HGET', KEYS[1], 'status')
if not status then return 'session_not_found' end
if status ~= 'lobby' then return 'locked' end
if redis.call('HEXISTS', KEYS[2], ARGV[1]) == 0 then return 'player_not_found' end
redis.call('HDEL', KEYS[3], ARGV[1])
redis.call('HDEL', KEYS[4], ARGV[1])
redis.call('PEXPIREAT', KEYS[1], ARGV[2])
return 'saved'`,
  ),
  setCharacter: luaScript<string>(
    4,
    `
local status = redis.call('HGET', KEYS[1], 'status')
if not status then return 'session_not_found' end
if status ~= 'lobby' then return 'locked' end
if redis.call('HEXISTS', KEYS[2], ARGV[1]) == 0 then return 'player_not_found' end
redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
redis.call('HDEL', KEYS[3], ARGV[1])
redis.call('HDEL', KEYS[4], ARGV[1])
redis.call('PEXPIREAT', KEYS[1], ARGV[3])
redis.call('PEXPIREAT', KEYS[2], ARGV[3])
return 'saved'`,
  ),
  saveSetup: luaScript<string>(
    2,
    `
local status = redis.call('HGET', KEYS[1], 'status')
if not status then return 'session_not_found' end
if status ~= 'lobby' then return 'setup_locked' end
redis.call('SET', KEYS[2], ARGV[1], 'PXAT', ARGV[3])
if redis.call('HGET', KEYS[1], 'summary') == ARGV[2] then return 'unchanged' end
redis.call('HSET', KEYS[1], 'summary', ARGV[2])
return 'changed'`,
  ),
  addImage: luaScript<string>(
    3,
    `
local status = redis.call('HGET', KEYS[1], 'status')
if not status then return 'session_not_found' end
if status ~= 'lobby' then return 'setup_locked' end
local isKnown = redis.call('ZSCORE', KEYS[2], ARGV[1]) ~= false
if not isKnown and redis.call('ZCARD', KEYS[2]) >= tonumber(ARGV[2]) then
  return 'limit_reached'
end
local time = redis.call('TIME')
local nowMs = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', nowMs)
if not isKnown and redis.call('ZCARD', KEYS[3]) >= tonumber(ARGV[5]) then
  return 'storage_full'
end
redis.call('ZADD', KEYS[2], 'NX', ARGV[7], ARGV[1])
redis.call('ZADD', KEYS[3], ARGV[6], ARGV[4])
if redis.call('PEXPIRETIME', KEYS[3]) < tonumber(ARGV[6]) then
  redis.call('PEXPIREAT', KEYS[3], ARGV[6])
end
redis.call('PEXPIREAT', KEYS[1], ARGV[3])
redis.call('PEXPIREAT', KEYS[2], ARGV[3])
return 'added'`,
  ),
  saveGame: luaScript<string>(
    4,
    `
if redis.call('EXISTS', KEYS[1]) == 0 then return 'session_not_found' end
local current = redis.call('HGET', KEYS[2], 'version') or ''
if current ~= ARGV[1] then return 'conflict' end
redis.call('HSET', KEYS[2], 'version', ARGV[2], 'state', ARGV[3])
redis.call('PEXPIREAT', KEYS[2], ARGV[4])
redis.call('DEL', KEYS[3])
if ARGV[5] == '1' then redis.call('DEL', KEYS[4]) end
return 'saved'`,
  ),
  resetGame: luaScript<number>(
    4,
    `
if redis.call('HGET', KEYS[1], 'status') ~= 'playing' then return 0 end
if redis.call('HGET', KEYS[2], 'version') ~= ARGV[1] then return 0 end
redis.call('HSET', KEYS[1], 'status', 'lobby')
redis.call('DEL', KEYS[3], KEYS[4])
return 1`,
  ),
  submitInput: luaScript<string>(
    3,
    `
if redis.call('EXISTS', KEYS[1]) == 0 then return 'closed' end
if redis.call('HGET', KEYS[2], 'version') ~= ARGV[1] then return 'closed' end
if ARGV[5] == '1' then
  redis.call('HSET', KEYS[3], ARGV[2], ARGV[3])
elseif redis.call('HSETNX', KEYS[3], ARGV[2], ARGV[3]) == 0 then
  return 'duplicate'
end
redis.call('PEXPIREAT', KEYS[3], ARGV[4])
return 'accepted'`,
  ),
  saveUpload: luaScript<string>(
    3,
    `
if redis.call('EXISTS', KEYS[1]) == 0 then return 'closed' end
if redis.call('HGET', KEYS[2], 'version') ~= ARGV[1] then return 'closed' end
redis.call('HSET', KEYS[3], ARGV[2], ARGV[3])
redis.call('PEXPIREAT', KEYS[3], ARGV[4])
return 'saved'`,
  ),
  deleteSession: luaScriptOverKeys<number>(`
if redis.call('GET', KEYS[2]) == ARGV[1] then redis.call('DEL', KEYS[2]) end
redis.call('DEL', KEYS[1], unpack(KEYS, 3))
return 1`),
  touchSession: luaScriptOverKeys<number>(`
if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
redis.call('PEXPIREAT', KEYS[1], ARGV[2])
for index = 3, #KEYS do redis.call('PEXPIREAT', KEYS[index], ARGV[2]) end
if redis.call('GET', KEYS[2]) == ARGV[1] then redis.call('PEXPIREAT', KEYS[2], ARGV[2]) end
return 1`),
};
