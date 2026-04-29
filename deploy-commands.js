const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command) {
    commands.push(command.data.toJSON());
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`슬래시 커맨드 ${commands.length}개 등록 중...`);

    if (process.env.GUILD_ID) {
      // 특정 서버에만 등록 (즉시 반영)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`서버(${process.env.GUILD_ID})에 커맨드 등록 완료!`);
    } else {
      // 전체 글로벌 등록 (최대 1시간 소요)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('글로벌 커맨드 등록 완료! (반영까지 최대 1시간 소요)');
    }
  } catch (error) {
    console.error(error);
  }
})();
