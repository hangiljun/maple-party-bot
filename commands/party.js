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
        .setDescription('모집할 콘텐츠를 선택하세요')
        .setRequired(true)
        .addChoices(
          { name: '커닝타워', value: '커닝타워' },
          { name: '월묘', value: '월묘' },
          { name: '카오스벨룸', value: '카오스벨룸' },
          { name: '카오스피에르', value: '카오스피에르' },
          { name: '카오스핑크빈', value: '카오스핑크빈' },
          { name: '카오스자쿰', value: '카오스자쿰' },
          { name: '하드힐라', value: '하드힐라' },
          { name: '진힐라', value: '진힐라' },
          { name: '하드반반', value: '하드반반' },
          { name: '하드매그너스', value: '하드매그너스' },
          { name: '아카이럼', value: '아카이럼' },
          { name: '하드빌란느', value: '하드빌란느' },
          { name: '세렌', value: '세렌' },
          { name: '칼로스', value: '칼로스' },
          { name: '검은마법사', value: '검은마법사' },
          { name: '듄켈', value: '듄켈' },
          { name: '글리터링', value: '글리터링' },
          { name: '사냥파티', value: '사냥파티' },
          { name: '기타', value: '기타' },
        )
    )
    .addStringOption(option =>
      option
        .setName('추가내용')
        .setDescription('추가 설명 (예: 4인팟, 공대장 경험자, 인원 2명 남음)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const content = interaction.options.getString('내용');
    const extra = interaction.options.getString('추가내용');
    const description = extra ? `${content} — ${extra}` : content;

    const embed = new EmbedBuilder()
      .setColor(0x00b0f4)
      .setTitle('🍁 파티 모집')
      .setDescription(description)
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
