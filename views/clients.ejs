<%- include('partials_header') %>

<h1>Клиенты</h1>

<% if (message) { %>
  <div class="alert ok"><%= message %></div>
<% } %>

<% if (error) { %>
  <div class="alert err"><%= error %></div>
<% } %>

<div class="row">
  <div class="card">
    <h2>Создать клиента</h2>
    <form method="post" action="/clients">
      <label>Логин</label>
      <input name="login" placeholder="user001" required />

      <label>Срок в днях</label>
      <input name="duration_days" type="number" min="0" value="0" />
      <small>0 = без даты окончания</small>

      <label>Лимит IP</label>
      <input name="limit_ip" type="number" min="1" value="1" required />

      <label>На каких узлах создать</label>
      <div class="checkbox-list">
        <% nodes.forEach(node => { %>
          <label>
            <input class="inline" type="checkbox" name="node_ids" value="<%= node.id %>" />
            <%= node.country_name_ru || node.name %> (inbound <%= node.inbound_id %>)
          </label>
        <% }) %>
      </div>

      <button type="submit">Создать клиента на узлах</button>
    </form>
  </div>

  <div class="card">
    <h2>Импорт клиентов из существующей панели</h2>
    <form method="post" action="/clients/import">
      <label>Узел-источник</label>
      <select name="node_id" required>
        <% nodes.forEach(node => { %>
          <option value="<%= node.id %>">
            <%= node.country_name_ru || node.name %> (inbound <%= node.inbound_id %>)
          </option>
        <% }) %>
      </select>

      <button type="submit">Импортировать клиентов</button>
    </form>

    <p style="margin-top:12px;">
      Импорт берёт клиентов из inbound выбранного узла и добавляет их в агрегатор.
    </p>
  </div>
</div>

<div class="card">
  <h2>Как выдаётся подписка</h2>
  <p>После создания или импорта для клиента генерируется один общий URL подписки.</p>
  <p>Внутри него несколько ссылок конфигураций — по одной на каждый узел.</p>
  <p>Ссылка остаётся постоянной: ты можешь пересылать её клиенту заново в любой момент.</p>
</div>

<div class="card">
  <h2>Все клиенты</h2>
  <table>
    <tr>
      <th>ID</th>
      <th>Имя</th>
      <th>Логин</th>
      <th>Подписка</th>
      <th>Действия</th>
    </tr>

    <% clients.forEach(client => { %>
      <tr>
        <td><%= client.id %></td>
        <td>
          <a href="/clients/<%= client.id %>"><%= client.display_name %></a>
        </td>
        <td><%= client.login %></td>
        <td>
          <button
            type="button"
            class="link-btn"
            onclick="copySubLink('<%= baseUrl %>/sub/<%= client.sub_slug %>')"
          >
            Скопировать
          </button>
        </td>
        <td>
          <form method="post" action="/clients/<%= client.id %>/delete" onsubmit="return confirm('Удалить клиента со всех узлов?')">
            <button class="danger" style="width:auto">Удалить</button>
          </form>
        </td>
      </tr>
    <% }) %>
  </table>
</div>

<script>
function copySubLink(text) {
  navigator.clipboard.writeText(text)
    .then(() => alert('Ссылка подписки скопирована'))
    .catch(() => alert('Не удалось скопировать ссылку'));
}
</script>

<%- include('partials_footer') %>