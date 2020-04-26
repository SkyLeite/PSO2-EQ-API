![Docker Automated build](https://img.shields.io/docker/automated/kaze404/pso2-eq-api)

# PSO2 EQ API

Websocket API with the latest EQ information from [@pso2_emg_hour](http://twitter.com/pso2_emg_hour). Used on [Weeb Bot](http://github.com/Kxze/WeebBot-v2).

## Using

Simply establish a websocket connection to `ws://pso2api.westeurope.azurecontainer.io:8080` and wait for events :)

## Reference

Currently the API sends nothing but the following payload:

```
{
    "id": "1254411171907731457"
    "date": {
        "UTC": "Sun Apr 26 2020 14:05:03 GMT+0000",
        "JP": "Sun Apr 26 2020 23:05:03 GMT+0900"
    },
    "upcoming": [
        {
            "date": {
                "UTC": "Sun Apr 26 2020 14:05:03 GMT+0000",
                "JP": "Sun Apr 26 2020 23:05:03 GMT+0900"
            },
            "name": "Mining Base Defense Training: VR"
        },
        {
            "date": {
                "UTC": "Sun Apr 26 2020 14:05:03 GMT+0000",
                "JP": "Sun Apr26 2020 23:05:03 GMT+0900"
            },
            "name": "Raging Dark Arms"
        },
    ],
    "inProgress": {
        "date": {
            "UTC": "Sun Apr 26 2020 14:05:03 GMT+0000",
            "JP": "Sun Apr 26 2020 23:05:03 GMT+0900"
        },
        "name": "Mining Base Defense Training: VR"
    },
}```

`id`: Unique identifier for the payload

`date`: Date referring to the object it's attached to.

`upcoming`: Array of upcoming emergency quests

`inProgress`: Current in-progress emergency quest. Will be omitted if there is none.

## Deploying

This project is available on [Dockerhub](https://hub.docker.com/repository/docker/kaze404/pso2-eq-api). Running should be as simple as running `docker run kaze404/pso2-eq-api:latest -p 8080:8080`. The API will be available for usage on the port 8080.
