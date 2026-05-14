# Identidade de Marca — Verbum

## Personalidade
- **Arquetipo:** O Sábio — O Sábio se manifesta no Verbum como o erudito-mentor que ilumina a Escritura através das línguas originais, do contexto histórico e da teologia sistemática — sem dogmatismo nem proselitismo. A marca acredita que a verdade liberta quando torna-se compreensível, e por isso converte a sabedoria dos seminários em descoberta acessível, tratando o leitor como interlocutor inteligente em uma jornada de contemplação.
- **Traits:**
  - profundidade intelectual acessível
  - reverência sem religiosidade vazia
  - clareza pedagógica
  - rigor teológico com empatia
  - elegância contemplativa
- **Anti-traits:**
  - superficialidade devocional
  - academicismo excludente
  - informalidade que trivializa o sagrado
- **Formalidade:** semi-formal
- **Tom de voz:** Educativo e acolhedor, no espectro contemplativo > educativo > convidativo > funcional > institucional. O Verbum nunca soa como quem vende — soa como quem convida a descobrir, oferecendo profundidade exegética sem academicismo árido e modernidade tecnológica sem genericidade SaaS, sempre respeitando a inteligência do leitor sem pressupor formação teológica prévia.
- **Emoji:** nunca
- **Vocabulario:** Culto mas não rebuscado. Prefere palavras com raiz latina e ressonância contemplativa (iluminar, contemplar, revelar, aprofundar, desvelar). Evita gírias, abreviações, jargão de marketing agressivo, sensacionalismo e frases proibidas como 'revolucionário', 'disruptivo' ou 'fácil e rápido'. Termos teológicos técnicos são usados quando necessários, sempre com explicação que respeita o leitor sem condescendência.
- **Principios de comunicacao:**
  - Toda complexidade teológica merece ser explicada com clareza, nunca simplificada a ponto de perder substância
  - Convidar ao estudo como jornada de descoberta, nunca como obrigação religiosa ou autoridade dogmática
  - Respeitar a inteligência do leitor sem pressupor formação teológica prévia
  - Posicionar a IA como ferramenta complementar ao estudo pessoal e à orientação pastoral, nunca como substituta
  - Materializar profundidade em estética editorial/livro digital — prose-friendly, contemplativa, distante do feed-style devocional do nicho

## Identidade Visual
### Paleta
- Primaria: `#0F1A2E` (Indigo Noturno (Azul-Noite Profundo)) — Indigo profundo materializa o arquétipo do Sábio e a estética de 'iluminação divina via conhecimento' — território cromático comprovadamente vazio no nicho (verificado na pesquisa: YouVersion ocupa vermelho-quente #F33A49, Bible AI ocupa cerulean #3B97D3, Hallow ocupa roxo católico). O tom indigo evoca contemplação noturna, profundidade teológica e cosmos, alinhando-se ao caso de uso real de estudo bíblico noturno (dark-mode-first) e à voz contemplativa-educativa, sem cair em corporativo azul nem em quente devocional.
- Secundaria: `#1E2A4A`
- Accent: `#C9A35A`
- Backgrounds: dark `#0A1220` / light `#F7F3EB`
- Textos: primary `#F2EDE2` / secondary `#C9C3B5` / muted `#8B8676`
- Semantica: success `#7A9B6E` / warning `#D4A84A` / danger `#A84444` / info `#6B8AB8`

### Paleta completa (Tailwind/design tokens)
```json
{
  "bg": {
    "bg": "#0A1220",
    "surface": "#0F1A2E",
    "card": "#1A2540",
    "elevated": "#22305A"
  },
  "text": {
    "primary": "#F2EDE2",
    "secondary": "#C9C3B5",
    "muted": "#8B8676",
    "disabled": "#5A5547"
  },
  "accent": {
    "DEFAULT": "#C9A35A",
    "hover": "#D4AF37",
    "pressed": "#A8863F",
    "dim": "#7A6532",
    "text": "#0F1A2E"
  },
  "semantic": {
    "success": { "DEFAULT": "#7A9B6E", "text": "#0F1A2E" },
    "warning": { "DEFAULT": "#D4A84A", "text": "#0F1A2E" },
    "danger":  { "DEFAULT": "#A84444", "text": "#F2EDE2" },
    "info":    { "DEFAULT": "#6B8AB8", "text": "#0F1A2E" }
  },
  "border": {
    "DEFAULT": "#2A3658",
    "muted": "#1A2540"
  }
}
```

### Tipografia
- Heading: **Cormorant Garamond** (pesos 400, 500, 600, 700)
- Body: **Inter** (pesos 400, 500, 600, 700)
- Mono: **JetBrains Mono**
- Racional: Cormorant Garamond entrega autoridade teológica clássica e leitura editorial confortável para títulos e citações bíblicas, ocupando um espaço tipográfico comprovadamente vazio no nicho (90% dos sites cristãos usam Open Sans/Roboto/Lato genéricas). Inter complementa como sans-serif geométrica moderna para UI e corpo longo, sinalizando 'IA contemporânea' sem cair no genérico SaaS. O pareamento serifa-editorial + sans-moderna é uma das três lacunas identificadas na pesquisa e materializa o arquétipo Sábio: profundidade intelectual acessível, elegância contemplativa, rigor com clareza. JetBrains Mono complementa para citações de referências canônicas (versículos, códigos) com legibilidade técnica.

### Border Radius
rounded — escala: sm 4px / md 8px / lg 12px / xl 16px

### Sombras
glow — Sombras sutis como base + glow dourado direcional muito discreto em elementos-chave (CTA principal, gerar estudo, citações destacadas) — materializa a metáfora de 'iluminação divina via conhecimento' sem kitsch religioso. Sinaliza autoridade teológica + modernidade IA, e nenhum concorrente direto explora glow contemplativo discreto (YouVersion e Bible AI usam apenas subtle shadow corporativo).

### Estilo de Ícones
- **Estilo:** outlined
- **Stroke width:** 1.5px
- **Racional:** Ícones outlined com stroke fino (1.5px) reforçam a estética editorial-livro e a elegância contemplativa do arquétipo Sábio, evitando o peso visual de ícones filled (que tendem a feed-style devocional) e a informalidade de hand-drawn. Stroke fino conversa com a tipografia serifa Cormorant Garamond e com o tom semi-formal de 'estudo profundo', mantendo clareza pedagógica sem trivializar o sagrado.

### Linguagem visual
Livro de estudo teológico digital iluminado por IA: estética editorial dark-mode-first com indigo profundo noturno como superfície dominante e dourado cálido como acento de 'iluminação'. Pareamento de serifa editorial clássica (Cormorant Garamond) com sans geométrica moderna (Inter) materializa autoridade teológica + modernidade tecnológica. Border-radius editorial moderado, glow dourado discreto em elementos-chave, tipografia generosa e prose-friendly que se distancia ativamente do feed-style devocional do nicho.

## Brand Guidelines
### Uso do logo
Logo Verbum em três versões oficiais: (1) horizontal — símbolo + wordmark 'Verbum' em Cormorant Garamond 600, uso preferencial em headers e materiais institucionais; (2) vertical — símbolo centralizado acima do wordmark, uso em formatos quadrados e splash screens; (3) símbolo-solo — uso em favicons, app icon e contextos onde a marca já está estabelecida. Espaçamento mínimo (clear space) equivalente a 2x a altura do símbolo em todos os lados, livre de qualquer outro elemento gráfico. Tamanho mínimo: 24px para o símbolo-solo (favicon/UI), 96px de largura para a versão horizontal e 64px de largura para a versão vertical, garantindo legibilidade do wordmark em serifa. Fundo preferencial: indigo noturno #0F1A2E ou superfície escura da paleta; em fundos claros, usar versão com símbolo e wordmark em indigo. Nunca aplicar sobre fotografias sem overlay de contraste, nunca alterar proporções, nunca recolorir fora da paleta oficial (apenas indigo, dourado #C9A35A ou neutro creme #F2EDE2), nunca adicionar sombras drop-shadow externas — apenas glow dourado discreto quando o contexto exigir destaque.

### Uso de cores
Proporção 60-30-10 contemplativa: 60% indigo noturno (#0A1220 background, #0F1A2E surface, #1A2540 card) como território cromático dominante que materializa contemplação e profundidade teológica; 30% neutros creme/areia (#F2EDE2 text primary, #C9C3B5 text secondary) para corpo de texto longo prose-friendly que evoca página de livro iluminada; 10% dourado #C9A35A reservado estritamente para acento de 'iluminação' — CTAs principais (gerar estudo, abrir passagem), citações bíblicas destacadas, ícones de estado ativo, links contextuais e glow direcional. Cores semânticas (success #7A9B6E, warning #D4A84A, danger #A84444, info #6B8AB8) usadas exclusivamente em feedback de sistema, nunca em comunicação editorial. Proibido usar dourado como background extenso (vira ouro corporativo), proibido inverter a proporção (indigo precisa dominar a tela), proibido introduzir cores fora da paleta para 'destaque sazonal'.

### Tipografia aplicada
Hierarquia tipográfica editorial: H1 Cormorant Garamond 600, 48-64px desktop / 32-40px mobile, line-height 1.1, tracking -0.02em — usado para títulos de página e nomes de passagens bíblicas. H2 Cormorant Garamond 600, 36-44px desktop / 28-32px mobile, line-height 1.15, tracking -0.015em — seções de estudo. H3 Cormorant Garamond 500, 24-32px, line-height 1.25, tracking -0.01em — subseções exegéticas. H4 Cormorant Garamond 500, 20-24px, line-height 1.3 — agrupamentos menores. H5/H6 Inter 600, 16-18px, uppercase letter-spacing 0.08em — labels e overlines. Body longo: Inter 400, 16-18px, line-height 1.7 (prose-friendly, max-width 65-75ch para leitura de estudos teológicos densos), tracking 0. Body UI: Inter 400-500, 14-16px, line-height 1.5. Citação bíblica destacada: Cormorant Garamond 500 italic, 20-24px, line-height 1.5, com filete dourado à esquerda. Referências canônicas e códigos (Strong's, lemas em grego/hebraico transliterado): JetBrains Mono 400, 13-14px, line-height 1.5. Botões e CTAs: Inter 600, 14-16px, tracking 0.01em. Nunca usar Cormorant para body longo (cansa a leitura), nunca usar Inter para títulos institucionais (apaga a autoridade editorial), nunca aplicar all-caps em parágrafos.

### Estilo de imagens
Estética editorial-livro-iluminado, distante do banco de imagens cristão genérico. Preferir: (1) tratamentos duotone em indigo profundo #0F1A2E + dourado #C9A35A sobre fotografias de manuscritos antigos, pergaminhos, bibliotecas teológicas, luz incidindo em páginas; (2) ilustrações editoriais line-art em stroke fino dourado/creme sobre fundo indigo, evocando gravuras teológicas históricas reinterpretadas com sensibilidade moderna; (3) detalhes tipográficos ampliados de letras hebraicas/gregas como elementos gráficos contemplativos; (4) campos negativos generosos com tipografia editorial protagonista. Evitar terminantemente: fotos genéricas de pessoas orando com mãos levantadas, paisagens de pôr-do-sol com versículos sobrepostos, stock photography de bíblias abertas com flares, ilustrações flat-design coloridas estilo SaaS, emojis ou pictogramas devocionais, cruzes ou símbolos religiosos explícitos como elemento decorativo (a marca não é confessional). Quando usar fotografia, sempre aplicar overlay indigo a 60-80% para integrar à paleta. Glow dourado discreto direcional pode iluminar pontos focais — nunca como filtro vintage saturado.

### Exemplos de tom
- Headline (hero da landing): 'Estude a Escritura como um teólogo. Sem precisar ser um.' — afirmativo, convidativo, posiciona profundidade acessível sem prometer atalho.
- CTA principal: 'Gerar estudo desta passagem' (não 'Comece grátis agora!' nem 'Descubra o segredo da Bíblia') — verbo de ação contemplativa, específico ao que acontece, sem urgência fabricada nem sensacionalismo.
- Mensagem de erro: 'Não foi possível gerar o estudo desta passagem agora. Tente novamente em instantes — sua seleção foi preservada.' — claro sobre o que aconteceu, respeitoso com o tempo do leitor, sem 'Ops!' nem culpabilização, oferece próximo passo concreto.
- Empty state (nenhum estudo gerado): 'Selecione um livro, capítulo e versículos para iniciar seu primeiro estudo. Sugerimos começar por uma passagem familiar — Salmo 23, João 1 ou Romanos 8.' — orienta sem condescendência, oferece pontos de partida que respeitam o leitor.
- Microcopy de carregamento: 'Consultando comentários, línguas originais e contexto histórico...' — transparente sobre o que a IA está fazendo, reforça profundidade teológica, evita 'Carregando...' genérico.

### O que NAO fazer
- NÃO usar emojis, exclamações entusiasmadas ou linguagem de marketing agressiva ('Revolucionário!', 'Disruptivo', 'Fácil e rápido', 'Descubra o segredo') — quebra a voz contemplativa do Sábio e trivializa o sagrado.
- NÃO posicionar a IA como autoridade espiritual, substituta do pastor ou oráculo dogmático — sempre como ferramenta complementar ao estudo pessoal e à orientação pastoral; jamais usar frases como 'A IA do Verbum revela a verdade' ou 'Descubra o que Deus quer te dizer'.
- NÃO usar fotografia genérica de stock cristão (mãos levantadas, pôr-do-sol com versículo sobreposto, bíblia aberta com luz divina) — empurra a marca para o feed-style devocional que ela ativamente rejeita.
- NÃO aplicar o dourado #C9A35A como background extenso, como cor de texto de corpo, ou em proporção superior a 10% da composição — vira ouro corporativo e perde a função de 'iluminação' direcional.
- NÃO usar Cormorant Garamond para texto de corpo longo, blocos de UI funcional ou parágrafos densos — a serifa é editorial-de-título; corpo longo é território exclusivo de Inter para preservar legibilidade prose-friendly.
- NÃO introduzir cores fora da paleta oficial para 'destaques sazonais', 'campanhas temáticas' ou 'gamificação' — a coerência cromática indigo+dourado+creme é o principal vetor de diferenciação no nicho.
- NÃO simplificar termos teológicos a ponto de perder substância (ex.: traduzir 'exegese' como 'análise rápida') nem usar jargão acadêmico sem explicação que respeite a inteligência do leitor — o equilíbrio rigor+clareza é inegociável.
- NÃO usar light mode como experiência padrão de leitura de estudos — a marca é dark-mode-first por caso de uso real (estudo noturno) e por território cromático estratégico; light mode existe apenas como acessibilidade opcional.
