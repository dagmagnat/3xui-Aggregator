services:
  aggregator:
    build: .
    container_name: 3xui-aggregator
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
