local function split(s, p)
    local rt = {}
    string.gsub(s, '[^' .. p .. ']+', function(w) table.insert(rt, w) end)
    return rt
end

local modelName = table.remove(KEYS, 1)
local objectStrings = KEYS

for _, objectStringNew in ipairs(objectStrings) do
    local objectNew = cjson.decode(objectStringNew)
    local fullKey = modelName .. ":" .. objectNew._id
    local objectStringOld = redis.call("get", fullKey)
    assert(objectStringOld, "update:object not exist")
    redis.call("set", fullKey, objectStringNew)
end