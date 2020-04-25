FROM node:8-slim

WORKDIR /server
COPY . /server
RUN npm install

EXPOSE 8080
CMD [ "npm", "start" ]
