FROM node:14.16.1-alpine3.12

RUN apk --no-cache add curl unixodbc-dev bash coreutils
RUN curl -O https://download.microsoft.com/download/e/4/e/e4e67866-dffd-428c-aac7-8d28ddafb39b/msodbcsql17_17.7.2.1-1_amd64.apk
RUN curl -O https://download.microsoft.com/download/e/4/e/e4e67866-dffd-428c-aac7-8d28ddafb39b/mssql-tools_17.7.1.1-1_amd64.apk

RUN apk --no-cache --allow-untrusted add g++ make python3 msodbcsql17_17.7.2.1-1_amd64.apk mssql-tools_17.7.1.1-1_amd64.apk
RUN ln -s /opt/microsoft/msodbcsql17/lib64/libmsodbcsql-17.7.so.2.1 /usr/lib/libmsodbcsql-17.so

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm install

COPY . .