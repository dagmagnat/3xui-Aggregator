<%- include('partials_header') %>

<h1><%= client.display_name %></h1>

<div class="card">
  <p><strong>Логин:</strong> <%= client.login %></p>
  <p><strong>UUID:</strong> <%= client.uuid %></p>

  <p>
    <strong>Общая подписка:</strong><br>
    <a href="<%= baseUrl %>/sub/<%= client.sub_slug %>" target="_blank">
      <%= baseUrl %>/sub/<%= client.sub_slug %>
    </a>
  </p>

  <button
    type="button"
    class="link-btn"
    onclick="copySubLink('<%= baseUrl %>/sub/<%= client.sub_slug %>')"
  >
    Скопировать подписку
  </button>
</div>

<div class="card">
  <h2>Добавить клиента на другие узлы</h2>

  <form method="post" action="/clients/<%= client.id %>/sync">
    <div class="checkbox-list">
      <% nodes.forEach(node => { %>
        <label>
          <input class="inline" type="checkbox" name="node_ids" value="<%= node.id %>" />
          <%= node.country_name_ru || node.name %> (inbound <%= node.inbound_id %>)
        </label>
      <% }) %>
    </div>

    <button type="submit" style="margin-top:10px;">Добавить на выбранные узлы</button>
  </form>
</div>

<div class="card">
  <h2>Узлы клиента</h2>
  <table>
    <tr>
      <th>Узел</th>
      <th>Статус</th>
      <th>Email в 3x-ui</th>
      <th>Ссылка</th>
    </tr>

    <% mappings.forEach(row => { %>
      <tr>
        <td><%= row.node_name %></td>
        <td><span class="badge <%= row.last_status %>"><%= row.last_status %></span></td>
        <td><%= row.remote_email %></td>
        <td>
          <% if (row.remote_sub_url) { %>
            <pre style="white-space:pre-wrap; word-break:break-word;"><%= row.remote_sub_url %></pre>
          <% } else { %>
            <span>Нет ссылки</span>
          <% } %>
        </td>
      </tr>
    <% }) %>
  </table>
</div>

<div class="card">
  <h2>Агрегированная подписка</h2>
  <pre style="white-space:pre-wrap; word-break:break-word;"><%= subscription %></pre>
</div>

<script>
function copySubLink(text) {
  navigator.clipboard.writeText(text)
    .then(() => alert('Ссылка подписки скопирована'))
    .catch(() => alert('Не удалось скопировать ссылку'));
}
</script>

<%- include('partials_footer') %>