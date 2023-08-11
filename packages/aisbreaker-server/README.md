# aisbreaker-proxy-server


## Run the public Docker image of this app

    # The '--init' is optional. It's to easy stop the container on command line
    docker run --init -p3000:3000 aisbreaker/aisbreaker-proxy-server:latest


## Build and run the Docker image locally


    docker build -t aisbreaker-proxy-server .
    docker run --init -p3000:3000 aisbreaker-proxy-server
    
Hint: The '--init' is optional. It's to easy stop the container on command line [How to fix Ctrl+C inside a Docker container?](https://www.tutorialspoint.com/how-to-fix-ctrlplusc-inside-a-docker-container)
