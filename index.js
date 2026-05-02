const {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

const partyApplicants = new Map();
const tradeApplicants = new Map();

client.once(Events.ClientReady, () => {
  console.log(`✅ 봇 준비 완료: ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error('슬래시 커맨드 오류:', err);
      const msg = { content: '❌ 오류가 발생했습니다.', flags: MessageFlags.Ephemeral };
      interaction.replied || interaction.deferred
        ? await interaction.followUp(msg)
        : await interaction.reply(msg);
    }
    return;
  }

  if (!interaction.isButton()) return;

  try {
    const [action, creatorId, extra] = interaction.customId.split(':');
    const messageId = interaction.message.id;
    const embed = interaction.message.embeds[0];

    if (action === 'join_party') {
      if (interaction.user.id === creatorId) {
        return interaction.reply({
          content: '❌ 본인이 만든 파티에는 신청할 수 없습니다.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (embed?.fields?.find(f => f.name === '상태')?.value === '🔴 마감') {
        return interaction.reply({
          content: '❌ 이미 마감된 파티입니다.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!partyApplicants.has(messageId)) partyApplicants.set(messageId, new Set());
      const applicants = partyApplicants.get(messageId);

      if (applicants.has(interaction.user.id)) {
        return interaction.reply({
          content: '⚠️ 이미 참가 신청을 하셨습니다!',
          flags: MessageFlags.Ephemeral,
        });
      }

      applicants.add(interaction.user.id);
      const applicantList = [...applicants].map(id => `<@${id}>`).join(', ');

      const updatedEmbed = new EmbedBuilder()
        .setColor(0x00b0f4)
        .setTitle(embed?.title ?? '🍁 파티 모집')
        .setDescription(embed?.description ?? '')
        .addFields(
          { name: '모집자', value: `<@${creatorId}>`, inline: true },
          { name: `신청자 (${applicants.size}명)`, value: applicantList, inline: true },
          { name: '상태', value: '🟢 모집 중', inline: true },
        )
        .setFooter({ text: '참가하기 버튼을 눌러 파티 신청을 하세요!' })
        .setTimestamp(new Date(embed.timestamp));

      await interaction.update({ embeds: [updatedEmbed], components: interaction.message.components });
      await interaction.followUp(`✅ **${interaction.user}**님이 파티에 참가 신청을 했습니다!`);

      try {
        const creator = await client.users.fetch(creatorId);
        await creator.send(
          `🎉 **${interaction.user.displayName}**님이 파티에 참가 신청을 했습니다!\n` +
          `> ${embed?.description ?? ''}\n` +
          `> 채널: <#${interaction.channelId}>`
        );
      } catch {}

      return;
    }

    if (action === 'close_party') {
      if (interaction.user.id !== creatorId) {
        return interaction.reply({
          content: '❌ 파티 마감은 모집자만 할 수 있습니다.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const applicants = partyApplicants.get(messageId) ?? new Set();
      const applicantList = applicants.size > 0
        ? [...applicants].map(id => `<@${id}>`).join(', ')
        : '없음';

      const closedEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(embed?.title ?? '🍁 파티 모집')
        .setDescription(embed?.description ?? '')
        .addFields(
          { name: '모집자', value: `<@${creatorId}>`, inline: true },
          { name: `신청자 (${applicants.size}명)`, value: applicantList, inline: true },
          { name: '상태', value: '🔴 마감', inline: true },
        )
        .setFooter({ text: '파티가 마감되었습니다.' })
        .setTimestamp(new Date(embed.timestamp));

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

      await interaction.update({ embeds: [closedEmbed], components: [disabledRow] });
      await interaction.followUp('🔒 파티가 마감되었습니다!');
    }

    if (action === 'trade_apply') {
      if (interaction.user.id === creatorId) {
        return interaction.reply({
          content: '❌ 본인 거래 글에는 신청할 수 없습니다.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const statusField = embed?.fields?.find(f => f.name === '상태');
      if (statusField?.value !== '🟢 거래 중') {
        return interaction.reply({
          content: '❌ 이미 종료된 거래입니다.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!tradeApplicants.has(messageId)) tradeApplicants.set(messageId, new Set());
      const applicants = tradeApplicants.get(messageId);

      if (applicants.has(interaction.user.id)) {
        return interaction.reply({
          content: '⚠️ 이미 신청하셨습니다!',
          flags: MessageFlags.Ephemeral,
        });
      }

      const maxSlots = parseInt(extra) || 1;
      if (applicants.size >= maxSlots) {
        return interaction.reply({
          content: '❌ 모집 인원이 가득 찼습니다.',
          flags: MessageFlags.Ephemeral,
        });
      }

      applicants.add(interaction.user.id);
      const applicantList = [...applicants].map(id => `<@${id}>`).join(', ');
      const isFull = applicants.size >= maxSlots;

      const isSell = embed.title?.includes('판매');
      const color = isSell ? 0x57f287 : 0x5865f2;
      const roleLabel = embed?.fields?.[0]?.name ?? '등록자';

      const updatedEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(embed.title)
        .setDescription(embed.description ?? '')
        .addFields(
          { name: roleLabel, value: `<@${creatorId}>`, inline: true },
          { name: '가격', value: embed.fields[1].value, inline: true },
          { name: '인원', value: `${applicants.size} / ${maxSlots}명`, inline: true },
          { name: `신청자 (${applicants.size}명)`, value: applicantList, inline: true },
          { name: '상태', value: isFull ? '🔴 마감' : '🟢 거래 중', inline: true },
        )
        .setFooter({ text: isFull ? '인원이 가득 찼습니다!' : '거래 신청 버튼을 눌러 신청하세요!' })
        .setTimestamp(new Date(embed.timestamp));

      await interaction.update({ embeds: [updatedEmbed], components: interaction.message.components });
      await interaction.followUp(`✅ **${interaction.user}**님이 거래 신청을 했습니다!`);

      try {
        const creator = await client.users.fetch(creatorId);
        await creator.send(
          `🤝 **${interaction.user.displayName}**님이 거래 신청을 했습니다!\n` +
          `> ${embed?.description ?? ''}\n` +
          `> 채널: <#${interaction.channelId}>`
        );
      } catch {}

      return;
    }

    if (action === 'close_trade') {
      if (interaction.user.id !== creatorId) {
        return interaction.reply({
          content: '❌ 거래 완료는 등록자만 할 수 있습니다.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const applicants = tradeApplicants.get(messageId) ?? new Set();
      const applicantList = applicants.size > 0
        ? [...applicants].map(id => `<@${id}>`).join(', ')
        : '없음';
      const roleLabel = embed?.fields?.[0]?.name ?? '등록자';

      const closedTradeEmbed = new EmbedBuilder()
        .setColor(0x95a5a6)
        .setTitle(embed.title)
        .setDescription(embed.description ?? '')
        .addFields(
          { name: roleLabel, value: `<@${creatorId}>`, inline: true },
          { name: '가격', value: embed.fields[1].value, inline: true },
          { name: '인원', value: embed.fields[2].value, inline: true },
          { name: `신청자 (${applicants.size}명)`, value: applicantList, inline: true },
          { name: '상태', value: '✅ 거래 완료', inline: true },
        )
        .setFooter({ text: '거래가 완료되었습니다.' })
        .setTimestamp(new Date(embed.timestamp));

      const disabledTradeRow = new ActionRowBuilder().addComponents(
        interaction.message.components[0].components.map(btn =>
          ButtonBuilder.from(btn.toJSON()).setDisabled(true)
        )
      );

      await interaction.update({ embeds: [closedTradeEmbed], components: [disabledTradeRow] });
      await interaction.followUp('✅ 거래가 완료되었습니다!');
      return;
    }

    if (action === 'cancel_trade') {
      if (interaction.user.id !== creatorId) {
        return interaction.reply({
          content: '❌ 취소는 등록자만 할 수 있습니다.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const applicants = tradeApplicants.get(messageId) ?? new Set();
      const applicantList = applicants.size > 0
        ? [...applicants].map(id => `<@${id}>`).join(', ')
        : '없음';
      const roleLabel = embed?.fields?.[0]?.name ?? '등록자';

      const cancelledEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(embed.title)
        .setDescription(embed.description ?? '')
        .addFields(
          { name: roleLabel, value: `<@${creatorId}>`, inline: true },
          { name: '가격', value: embed.fields[1].value, inline: true },
          { name: '인원', value: embed.fields[2].value, inline: true },
          { name: `신청자 (${applicants.size}명)`, value: applicantList, inline: true },
          { name: '상태', value: '❌ 취소됨', inline: true },
        )
        .setFooter({ text: '거래가 취소되었습니다.' })
        .setTimestamp(new Date(embed.timestamp));

      const cancelledRow = new ActionRowBuilder().addComponents(
        interaction.message.components[0].components.map(btn =>
          ButtonBuilder.from(btn.toJSON()).setDisabled(true)
        )
      );

      await interaction.update({ embeds: [cancelledEmbed], components: [cancelledRow] });
      await interaction.followUp('❌ 거래가 취소되었습니다.');
      return;
    }

  } catch (err) {
    console.error('버튼 인터랙션 오류:', err);
    try {
      const msg = { content: '❌ 오류가 발생했습니다.', flags: MessageFlags.Ephemeral };
      interaction.replied || interaction.deferred
        ? await interaction.followUp(msg)
        : await interaction.reply(msg);
    } catch {}
  }
});

client.login(process.env.DISCORD_TOKEN);
