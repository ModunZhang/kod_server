local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local modelName = KEYS[1]
local id = KEYS[2]
local indexs = ARGV
local fullKey = modelName .. ":" .. id
local objectString = redis.call("get", fullKey)
local object = cjson.decode(objectString)
if not object then return end
for _, index in ipairs(indexs) do
    local value = object
    local levels = split(index, ".")
    for _, current in ipairs(levels) do
        value = value[current]
    end
    local key = modelName .. "." .. index .. ":" .. value
    redis.call("del", key)
end
redis.call("del", fullKey)