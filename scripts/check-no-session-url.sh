#!/usr/bin/env bash
#
# コミットメッセージに claude.ai のセッション URL（Claude-Session 行など）が入っていないかを確かめる。
# このリポジトリは公開なので、セッションへのリンクを履歴に残さない。lefthook（lefthook.yml）から呼ばれる。
#
# 使い方（リポジトリの直下で）:
#   bash scripts/check-no-session-url.sh --message <ファイル>   コミットメッセージ 1 つ（commit-msg フック）
#   bash scripts/check-no-session-url.sh --push                 push するコミット。標準入力に pre-push の入力を渡す
#   bash scripts/check-no-session-url.sh --range <rev-list の引数…>  指定したコミット（例: --range origin/main..HEAD）
#
# 終了コード: 0 = 入っていない / 1 = 入っていた / 2 = 使い方の誤り・範囲を読めない
set -euo pipefail

# Claude-Session トレーラーと、claude.ai のセッション URL（/code/session_…）
PATTERN='^[[:space:]]*Claude-Session:|claude\.ai/code/session_'

# 範囲内のコミットを 1 つずつ調べ、入っていたものを出す。1 つでもあれば 1 を返す。
check_commits() {
  local commits c bad=0
  if ! commits=$(git rev-list "$@" 2>&1); then
    echo "コミットの範囲を読めません: $*" >&2
    echo "$commits" >&2
    exit 2
  fi
  for c in $commits; do
    if git log -1 --format=%B "$c" | grep -E -i -q "$PATTERN"; then
      echo "  $(git log -1 --format='%h %s' "$c")" >&2
      bad=1
    fi
  done
  return "$bad"
}

report_commits() {
  echo "claude.ai のセッション URL（Claude-Session 行など）が入っているコミットがあります。" >&2
  echo "このリポジトリは公開なので、push する前にメッセージから消してください。" >&2
  echo "未 push のコミットなら、次でその行だけを消せます（範囲は push 先に合わせる）:" >&2
  echo "  FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --msg-filter \"sed '/^Claude-Session: /d'\" -- origin/main..HEAD" >&2
}

case "${1:-}" in
  --message)
    file="${2:?--message のあとにコミットメッセージのファイルを渡してください}"
    # コメント行（#）と、git commit -v で付く差分（はさみ線より下）は、コミットに残らないので除く
    found=$(sed -e '/^# -\{24\} >8 -\{24\}$/,$d' -e '/^#/d' "$file" | grep -E -i -n "$PATTERN" || true)
    if [ -n "$found" ]; then
      echo "コミットメッセージに claude.ai のセッション URL が入っています（このリポジトリは公開なので入れない）:" >&2
      echo "$found" | sed 's/^/  /' >&2
      echo "その行を消してから、もう一度コミットしてください。" >&2
      exit 1
    fi
    ;;
  --push)
    # git は push する ref ごとに「ローカルの ref ローカルの oid リモートの ref リモートの oid」を 1 行で渡す
    status=0
    while read -r _local_ref local_oid _remote_ref remote_oid; do
      [ -n "${local_oid:-}" ] || continue
      case "$local_oid" in *[!0]*) ;; *) continue ;; esac   # ブランチの削除は調べるものがない
      case "$remote_oid" in
        *[!0]*)
          if git cat-file -e "${remote_oid}^{commit}" 2>/dev/null; then
            set -- "${remote_oid}..${local_oid}"
          else
            set -- "$local_oid" --not --remotes                # リモートの先端が手元に無い（fetch していない）
          fi
          ;;
        *) set -- "$local_oid" --not --remotes ;;              # 新しいブランチ: どのリモートにも無いコミット
      esac
      check_commits "$@" || status=1
    done
    if [ "$status" -ne 0 ]; then
      report_commits
      exit 1
    fi
    ;;
  --range)
    shift
    [ $# -gt 0 ] || { echo "--range のあとに範囲を渡してください（例: origin/main..HEAD）" >&2; exit 2; }
    if ! check_commits "$@"; then
      report_commits
      exit 1
    fi
    echo "セッション URL の入ったコミットはありません。"
    ;;
  *)
    sed -n '3,11p' "$0" | sed 's/^# \{0,1\}//' >&2
    exit 2
    ;;
esac
