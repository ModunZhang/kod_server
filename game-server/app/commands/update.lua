local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local modelName = KEYS[1]
local objectStringNew = KEYS[2]
local indexs = ARGV
local objectNew = cjson.decode(objectStringNew)
local fullKey = modelName .. ":" .. objectNew._id
local objectStringOld = redis.call("get", fullKey)
local objectOld = cjson.decode(objectStringOld)

for _, index in ipairs(indexs) do
    local value = objectOld
    local levels = split(index, ".")
    for _, current in ipairs(levels) do
        value = value[current]
    end

    local key = modelName .. "." .. index .. ":" .. value
    redis.call("del", key)
end


redis.call("set", fullKey, objectStringNew)
for _, index in ipairs(indexs) do
    local value = objectNew
    local levels = split(index, ".")
    for _, current in ipairs(levels) do
        value = value[current]
    end

    local key = modelName .. "." .. index .. ":" .. value
    redis.call("set", key, objectNew._id)
end