import redis, json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)
keys = r.keys('courses:*')
print(f"Redis keys matching courses:* : {keys}")
for k in keys:
    ttl = r.ttl(k)
    val = r.get(k)
    print(f"\nKey: {k} | TTL: {ttl}s")
    if val:
        data = json.loads(val)
        if isinstance(data, list):
            print(f"  Cached course count: {len(data)}")
            for c in data:
                print(f"  - [{c.get('status')}] {c.get('title')}")
        else:
            print(f"  Value type: {type(data)}")
