FROM node:12-slim

WORKDIR /server
COPY . /server
RUN npm install --unsafe-perm

EXPOSE 8080
CMD [ "npm", "start" ]
