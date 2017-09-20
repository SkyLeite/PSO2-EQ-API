# PSO2 EQ API

API with the latest EQ information from [@pso2_emg_hour](http://twitter.com/pso2_emg_hour). Used on [Weeb Bot](http://github.com/Kxze/WeebBot-v2).

## Reference

- `/eq` - Returns every tweet on an array of objects. Response:

```
[
    {
        "time": "2017-08-29T01:05:04.000Z",
        "when": "2017-08-29T02:00:02.000Z",
        "eqs": [
            {
                "name": "Phantom God of Creation",
                "jpName": "新世を成す幻創の造神",
                "ship": 1
            }
        ]
    }
]
```

`time`: DateTime of when the Tweet was sent.

`when`: DateTime of when the EQ is scheduled to happen.

`eqs`: Array of `eq` objects, containing the English name as `name`, japanese name as `jpName` and `ship` as the ship it's happening on.
