FROM node:18-alpine

RUN apk --no-cache add curl unixodbc-dev bash coreutils
RUN curl -O https://download.microsoft.com/download/e/1/f/e1fd45c0-94c7-4c8f-b095-5577c420f7d7/msodbcsql18_18.2.2.1-1_amd64.apk
RUN curl -O https://download.microsoft.com/download/e/1/f/e1fd45c0-94c7-4c8f-b095-5577c420f7d7/mssql-tools18_18.2.1.1-1_amd64.apk

RUN apk --no-cache --allow-untrusted add \
    g++ \
    make \
    python3 \
    msodbcsql18_18.2.2.1-1_amd64.apk \
    mssql-tools18_18.2.1.1-1_amd64.apk

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm install
RUN npm install msnodesqlv8

COPY . .