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
if redis.call('EXISTS', KEYS[1]) == 0 then return 'session_not_found' end
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
  touchSession: defineScript({
    NUMBER_OF_KEYS: 7,
    SCRIPT: `
if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
redis.call('PEXPIREAT', KEYS[1], ARGV[2])
redis.call('PEXPIREAT', KEYS[3], ARGV[2])
redis.call('PEXPIREAT', KEYS[4], ARGV[2])
redis.call('PEXPIREAT', KEYS[5], ARGV[2])
redis.call('PEXPIREAT', KEYS[6], ARGV[2])
redis.call('PEXPIREAT', KEYS[7], ARGV[2])
if redis.call('GET', KEYS[2]) == ARGV[1] then redis.call('PEXPIREAT', KEYS[2], ARGV[2]) end
return 1`,
    parseCommand: (parser: CommandParser, keys: RedisArgument[], args: RedisArgument[]) => pushAll(parser, keys, args),
    transformReply: undefined as unknown as () => number,
  }),
};
