<?php

require_once('config.php');
require_once('auth.php');
require_once('verify_lib.php');

header("Content-Type: application/json");

if ($https && !isset($_SERVER['HTTPS'])) {
  // We're using mod_rewrite .htaccess for HTTPS redirect; this shouldn't happen
  exit(json_encode(array(
    'error' => 'tls_failure',
  )));
}

if (user_logged_in()) {
  exit(json_encode(array(
    'error' => 'already_logged_in',
  )));
}
if (
  !isset($_POST['username']) ||
  !isset($_POST['email']) ||
  !isset($_POST['password'])
) {
  exit(json_encode(array(
    'error' => 'invalid_parameters',
  )));
}
$username = $_POST['username'];
$email = $_POST['email'];
$password = $_POST['password'];
if (trim($password) === '') {
  exit(json_encode(array(
    'error' => 'empty_password',
  )));
}

$valid_username_regex = "/^[a-zA-Z0-9-_]+$/";
if (!preg_match($valid_username_regex, $username)) {
  exit(json_encode(array(
    'error' => 'invalid_username',
  )));
}

$valid_email_regex = "/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+".
  "@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?".
  "(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/";
if (!preg_match($valid_email_regex, $email)) {
  exit(json_encode(array(
    'error' => 'invalid_email',
  )));
}

$username = $conn->real_escape_string($username);
$email = $conn->real_escape_string($email);

$result = $conn->query(
  "SELECT COUNT(id) AS count FROM users ".
    "WHERE LCASE(username) = LCASE('$username')"
);
$matching_username_row = $result->fetch_assoc();
if ($matching_username_row['count'] !== '0') {
  exit(json_encode(array(
    'error' => 'username_taken',
  )));
}
$result = $conn->query(
  "SELECT COUNT(id) AS count FROM users WHERE LCASE(email) = LCASE('$email')"
);
$matching_email_row = $result->fetch_assoc();
if ($matching_email_row['count'] !== '0') {
  exit(json_encode(array(
    'error' => 'email_taken',
  )));
}

$hash = password_hash($password, PASSWORD_BCRYPT);
$time = round(microtime(true) * 1000); // in milliseconds
$conn->query("INSERT INTO ids(table_name) VALUES('users')");
$id = $conn->insert_id;
$conn->query(
  "INSERT INTO users(id, username, hash, email, creation_time) ".
    "VALUES ($id, '$username', '$hash', '$email', $time)"
);

create_user_cookie($id);

verify_email($id, $username, $email, true);

exit(json_encode(array(
  'success' => true,
)));