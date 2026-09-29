import { type CommandParser, defineScript, type RedisArgument } from "redis";

const pushAll = (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => {
  for (const key of keys) parser.pushKey(key);
  parser.push(...args);
};

export const sessionScripts = {
  createSession: defineScript({
    NUMBER_OF_KEYS: 2,
    SCRIPT: `
if not redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PXAT', ARGV[2]) then return 0 end
redis.call('HSET', KEYS[2], unpack(ARGV, 3))
redis.call('PEXPIREAT', KEYS[2], ARGV[2])
return 1`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => number,
  }),
  addPlayer: defineScript({
    NUMBER_OF_KEYS: 3,
    SCRIPT: `
if redis.call('EXISTS', KEYS[1]) == 0 then return 'session_not_found' end
if redis.call('HLEN', KEYS[2]) >= tonumber(ARGV[4]) then return 'session_full' end
if redis.call('HSETNX', KEYS[3], ARGV[3], ARGV[1]) == 0 then return 'name_taken' end
redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])
redis.call('PEXPIREAT', KEYS[1], ARGV[5])
redis.call('PEXPIREAT', KEYS[2], ARGV[5])
redis.call('PEXPIREAT', KEYS[3], ARGV[5])
return 'added'`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => string,
  }),
  removePlayer: defineScript({
    NUMBER_OF_KEYS: 5,
    SCRIPT: `
local status = redis.call('HGET', KEYS[1], 'status')
if not status then return 'session_not_found' end
if status ~= 'lobby' then return 'locked' end
if redis.call('HDEL', KEYS[2], ARGV[1]) == 0 then return 'player_not_found' end
if redis.call('HGET', KEYS[3], ARGV[2]) == ARGV[1] then redis.call('HDEL', KEYS[3], ARGV[2]) end
redis.call('HDEL', KEYS[4], ARGV[1])
redis.call('HDEL', KEYS[5], ARGV[1])
redis.call('PEXPIREAT', KEYS[1], ARGV[3])
return 'removed'`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => string,
  }),
  setSessionStatus: defineScript({
    NUMBER_OF_KEYS: 1,
    SCRIPT: `
if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
redis.call('HSET', KEYS[1], 'status', ARGV[1])
return 1`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => number,
  }),
  setAvatar: defineScript({
    NUMBER_OF_KEYS: 4,
    SCRIPT: `
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
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => string,
  }),
  removeAvatar: defineScript({
    NUMBER_OF_KEYS: 4,
    SCRIPT: `
local status = redis.call('HGET', KEYS[1], 'status')
if not status then return 'session_not_found' end
if status ~= 'lobby' then return 'locked' end
if redis.call('HEXISTS', KEYS[2], ARGV[1]) == 0 then return 'player_not_found' end
redis.call('HDEL', KEYS[3], ARGV[1])
redis.call('HDEL', KEYS[4], ARGV[1])
redis.call('PEXPIREAT', KEYS[1], ARGV[2])
return 'saved'`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => string,
  }),
  setCharacter: defineScript({
    NUMBER_OF_KEYS: 4,
    SCRIPT: `
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
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => string,
  }),
  saveSetup: defineScript({
    NUMBER_OF_KEYS: 2,
    SCRIPT: `
local status = redis.call('HGET', KEYS[1], 'status')
if not status then return 'session_not_found' end
if status ~= 'lobby' then return 'setup_locked' end
redis.call('SET', KEYS[2], ARGV[1], 'PXAT', ARGV[3])
if redis.call('HGET', KEYS[1], 'summary') == ARGV[2] then return 'unchanged' end
redis.call('HSET', KEYS[1], 'summary', ARGV[2])
return 'changed'`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => string,
  }),
  addImage: defineScript({
    NUMBER_OF_KEYS: 3,
    SCRIPT: `
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
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => string,
  }),
  saveGame: defineScript({
    NUMBER_OF_KEYS: 4,
    SCRIPT: `
if redis.call('EXISTS', KEYS[1]) == 0 then return 'session_not_found' end
local current = redis.call('HGET', KEYS[2], 'version') or ''
if current ~= ARGV[1] then return 'conflict' end
redis.call('HSET', KEYS[2], 'version', ARGV[2], 'state', ARGV[3])
redis.call('PEXPIREAT', KEYS[2], ARGV[4])
redis.call('DEL', KEYS[3])
if ARGV[5] == '1' then redis.call('DEL', KEYS[4]) end
return 'saved'`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => string,
  }),
  resetGame: defineScript({
    NUMBER_OF_KEYS: 4,
    SCRIPT: `
if redis.call('HGET', KEYS[1], 'status') ~= 'playing' then return 0 end
if redis.call('HGET', KEYS[2], 'version') ~= ARGV[1] then return 0 end
redis.call('HSET', KEYS[1], 'status', 'lobby')
redis.call('DEL', KEYS[3], KEYS[4])
return 1`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => number,
  }),
  submitInput: defineScript({
    NUMBER_OF_KEYS: 3,
    SCRIPT: `
if redis.call('EXISTS', KEYS[1]) == 0 then return 'closed' end
if redis.call('HGET', KEYS[2], 'version') ~= ARGV[1] then return 'closed' end
if ARGV[5] == '1' then
  redis.call('HSET', KEYS[3], ARGV[2], ARGV[3])
elseif redis.call('HSETNX', KEYS[3], ARGV[2], ARGV[3]) == 0 then
  return 'duplicate'
end
redis.call('PEXPIREAT', KEYS[3], ARGV[4])
return 'accepted'`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => string,
  }),
  saveUpload: defineScript({
    NUMBER_OF_KEYS: 3,
    SCRIPT: `
if redis.call('EXISTS', KEYS[1]) == 0 then return 'closed' end
if redis.call('HGET', KEYS[2], 'version') ~= ARGV[1] then return 'closed' end
redis.call('HSET', KEYS[3], ARGV[2], ARGV[3])
redis.call('PEXPIREAT', KEYS[3], ARGV[4])
return 'saved'`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => string,
  }),
  deleteSession: defineScript({
    NUMBER_OF_KEYS: 11,
    SCRIPT: `
if redis.call('GET', KEYS[2]) == ARGV[1] then redis.call('DEL', KEYS[2]) end
redis.call('DEL', KEYS[1], KEYS[3], KEYS[4], KEYS[5], KEYS[6], KEYS[7], KEYS[8], KEYS[9], KEYS[10], KEYS[11])
return 1`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => number,
  }),
  touchSession: defineScript({
    NUMBER_OF_KEYS: 11,
    SCRIPT: `
if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
redis.call('PEXPIREAT', KEYS[1], ARGV[2])
redis.call('PEXPIREAT', KEYS[3], ARGV[2])
redis.call('PEXPIREAT', KEYS[4], ARGV[2])
redis.call('PEXPIREAT', KEYS[5], ARGV[2])
redis.call('PEXPIREAT', KEYS[6], ARGV[2])
redis.call('PEXPIREAT', KEYS[7], ARGV[2])
redis.call('PEXPIREAT', KEYS[8], ARGV[2])
redis.call('PEXPIREAT', KEYS[9], ARGV[2])
redis.call('PEXPIREAT', KEYS[10], ARGV[2])
redis.call('PEXPIREAT', KEYS[11], ARGV[2])
if redis.call('GET', KEYS[2]) == ARGV[1] then redis.call('PEXPIREAT', KEYS[2], ARGV[2]) end
return 1`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => number,
  }),
};
