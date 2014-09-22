local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local modelName = KEYS[1]
local objectsString = KEYS[2]
local indexs = ARGV
local objects = cjson.decode(objectsString)
for _, object in ipairs(objects) do
    local objectString = cjson.encode(object)
    local fullKey = modelName .. ":" .. object._id
    redis.call("set", fullKey, objectString)
    for _, index in ipairs(indexs) do
        local value = object
        local levels = split(index, ".")
        for _, current in ipairs(levels) do
            value = value[current]
        end
        local indexKey = modelName .. "." .. index .. ":" .. value
        redis.call("set", indexKey, object._id)
    end
end