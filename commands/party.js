const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('파티')
    .setDescription('파티원을 모집합니다')
    .addStringOption(option =>
      option
        .setName('내용')
        .setDescription('파티 모집 내용 (예: 카오스벨룸 파티원 2명 구합니다 4인팟)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const content = interaction.options.getString('내용');

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle('🍁 파티 모집')
      .setDescription(content)
      .addFields(
        { name: '모집자', value: `<@${interaction.user.id}>`, inline: true },
        { name: '신청자', value: '없음', inline: true },
        { name: '상태', value: '🟢 모집 중', inline: true },
      )
      .setFooter({ text: '참가하기 버튼을 눌러 파티 신청을 하세요!' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`join_party:${interaction.user.id}`)
        .setLabel('참가하기')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✋'),
      new ButtonBuilder()
        .setCustomId(`close_party:${interaction.user.id}`)
        .setLabel('파티 마감')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
