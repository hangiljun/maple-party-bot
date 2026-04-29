const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// 커맨드 파일 로드
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// 파티별 신청자 목록: Map<messageId, Set<userId>>
const partyApplicants = new Map();

client.once(Events.ClientReady, () => {
  console.log(`✅ 봇 준비 완료: ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  // 슬래시 커맨드
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      const msg = { content: '❌ 오류가 발생했습니다.', ephemeral: true };
      interaction.replied || interaction.deferred
        ? await interaction.followUp(msg)
        : await interaction.reply(msg);
    }
    return;
  }

  // 버튼 인터랙션
  if (!interaction.isButton()) return;

  const [action, creatorId] = interaction.customId.split(':');
  const messageId = interaction.message.id;

  // ─── 참가하기 버튼 ───────────────────────────────────────────────────────
  if (action === 'join_party') {
    // 본인 파티엔 신청 불가
    if (interaction.user.id === creatorId) {
      await interaction.reply({ content: '❌ 본인이 만든 파티에는 신청할 수 없습니다.', ephemeral: true });
      return;
    }

    // 마감된 파티 체크 (embed 색상으로 판단)
    const embed = interaction.message.embeds[0];
    if (embed?.fields?.find(f => f.name === '상태')?.value === '🔴 마감') {
      await interaction.reply({ content: '❌ 이미 마감된 파티입니다.', ephemeral: true });
      return;
    }

    if (!partyApplicants.has(messageId)) {
      partyApplicants.set(messageId, new Set());
    }
    const applicants = partyApplicants.get(messageId);

    // 중복 신청 방지
    if (applicants.has(interaction.user.id)) {
      await interaction.reply({ content: '⚠️ 이미 참가 신청을 하셨습니다!', ephemeral: true });
      return;
    }

    applicants.add(interaction.user.id);

    // 신청자 목록 텍스트 생성
    const applicantList = [...applicants].map(id => `<@${id}>`).join(', ');

    // 임베드 신청자 필드 업데이트
    const updatedEmbed = EmbedBuilder.from(embed).setFields(
      { name: '모집자', value: `<@${creatorId}>`, inline: true },
      { name: `신청자 (${applicants.size}명)`, value: applicantList, inline: true },
      { name: '상태', value: '🟢 모집 중', inline: true },
    );

    await interaction.message.edit({ embeds: [updatedEmbed] });

    // 1) 공개 채팅에 알림
    await interaction.reply(`✅ **${interaction.user}**님이 파티에 참가 신청을 했습니다!`);

    // 2) 파티장에게 DM 발송
    try {
      const creator = await client.users.fetch(creatorId);
      await creator.send(
        `🎉 **${interaction.user.displayName}**님이 파티에 참가 신청을 했습니다!\n` +
        `> ${embed.description ?? ''}\n` +
        `> 채널: <#${interaction.channelId}>`
      );
    } catch {
      // 파티장이 DM을 막아뒀을 때는 조용히 무시
    }
    return;
  }

  // ─── 파티 마감 버튼 ──────────────────────────────────────────────────────
  if (action === 'close_party') {
    if (interaction.user.id !== creatorId) {
      await interaction.reply({ content: '❌ 파티 마감은 모집자만 할 수 있습니다.', ephemeral: true });
      return;
    }

    const embed = interaction.message.embeds[0];
    const applicants = partyApplicants.get(messageId) ?? new Set();
    const applicantList = applicants.size > 0
      ? [...applicants].map(id => `<@${id}>`).join(', ')
      : '없음';

    const closedEmbed = EmbedBuilder.from(embed)
      .setColor(0xff0000)
      .setFields(
        { name: '모집자', value: `<@${creatorId}>`, inline: true },
        { name: `신청자 (${applicants.size}명)`, value: applicantList, inline: true },
        { name: '상태', value: '🔴 마감', inline: true },
      );

    // 버튼 비활성화
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_party:${creatorId}`)
        .setLabel('참가하기')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✋')
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`close_party:${creatorId}`)
        .setLabel('파티 마감')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
        .setDisabled(true),
    );

    await interaction.message.edit({ embeds: [closedEmbed], components: [disabledRow] });
    await interaction.reply('🔒 파티가 마감되었습니다!');
  }
});

client.login(process.env.DISCORD_TOKEN);
