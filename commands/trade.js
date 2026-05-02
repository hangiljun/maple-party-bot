const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('거래')
    .setDescription('자리 판매 또는 구매 글을 올립니다')
    .addStringOption(option =>
      option
        .setName('유형')
        .setDescription('판매 또는 구매')
        .setRequired(true)
        .addChoices(
          { name: '📦 판매', value: 'sell' },
          { name: '🛒 구매', value: 'buy' },
        )
    )
    .addStringOption(option =>
      option
        .setName('내용')
        .setDescription('거래 내용 (예: 카오스 반반 자리 팝니다, 주간보스 자리 구해요)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('가격')
        .setDescription('거래 가격 (예: 1억, 2000만, 협의)')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('인원')
        .setDescription('모집 인원 수 (기본값: 1)')
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)
    ),

  async execute(interaction) {
    const type = interaction.options.getString('유형');
    const content = interaction.options.getString('내용');
    const price = interaction.options.getString('가격') ?? '협의';
    const slots = interaction.options.getInteger('인원') ?? 1;

    const isSell = type === 'sell';
    const title = isSell ? '📦 자리 판매' : '🛒 자리 구매';
    const color = isSell ? 0x57f287 : 0x5865f2;
    const roleLabel = isSell ? '판매자' : '구매자';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setDescription(content)
      .addFields(
        { name: roleLabel, value: `<@${interaction.user.id}>`, inline: true },
        { name: '가격', value: price, inline: true },
        { name: '인원', value: `0 / ${slots}명`, inline: true },
        { name: '신청자', value: '없음', inline: true },
        { name: '상태', value: '🟢 거래 중', inline: true },
      )
      .setFooter({ text: '거래 신청 버튼을 눌러 신청하세요!' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`trade_apply:${interaction.user.id}:${slots}`)
        .setLabel('거래 신청')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🤝'),
      new ButtonBuilder()
        .setCustomId(`close_trade:${interaction.user.id}`)
        .setLabel('거래 완료')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId(`cancel_trade:${interaction.user.id}`)
        .setLabel('취소')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌'),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
