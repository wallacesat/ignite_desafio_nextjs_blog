import * as React from 'react'; //eslint-disable-line
import { GetStaticProps } from 'next';
import Link from 'next/link';
import Head from 'next/head';
import { FiCalendar, FiUser } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import { Document } from '@prismicio/client/types/documents';

import { formatDateBlogHelper } from '../utils/date';

import Header from '../components/Header';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

function handlePostsResults(results: Document[]): unknown {
  return results.map(post => {
    const {
      uid,
      first_publication_date,
      data: { title, subtitle, author },
      ...rest
    } = post;

    return {
      ...rest,
      uid,
      first_publication_date,
      data: {
        title: typeof title === 'string' ? title : RichText.asText(title),
        subtitle:
          typeof subtitle === 'string' ? subtitle : RichText.asText(subtitle),
        author: typeof author === 'string' ? author : RichText.asText(author),
      },
    } as Post;
  });
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const { next_page, results } = postsPagination;

  const [nextPage, setNextPage] = React.useState(next_page);
  const [posts, setPosts] = React.useState(results);

  async function handleNextPage(): Promise<void> {
    try {
      const response = await window.fetch(nextPage);
      const { next_page: next, results: data } = await response.json();

      setNextPage(next);
      setPosts(oldPosts => [
        ...oldPosts,
        ...(handlePostsResults(data as Document[]) as Post[]),
      ]);
    } catch (err) {
      console.log('Erro na paginação: ', err); //eslint-disable-line
    }
  }

  return (
    <>
      <Head>
        <title>Home | spacetraveling</title>
      </Head>
      <Header />
      <main className={commonStyles.container}>
        <div className={styles.posts}>
          {posts.map(post => {
            return (
              <Link key={post.uid} href={`/post/${post.uid}`}>
                <a>
                  <strong>{post.data.title}</strong>
                  <p>{post.data.subtitle}</p>
                  <div>
                    <FiCalendar />{' '}
                    <time>
                      {formatDateBlogHelper(
                        new Date(post.first_publication_date)
                      )}
                    </time>
                    <span>
                      <FiUser /> {post.data.author}
                    </span>
                  </div>
                </a>
              </Link>
            );
          })}
          {nextPage && (
            <button type="button" onClick={handleNextPage}>
              Carregar mais posts
            </button>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query('[at(document.type, "post")]', {
    pageSize: 1,
  });

  const results = handlePostsResults(postsResponse.results);

  const postsPagination = {
    next_page: postsResponse.next_page,
    results,
  };

  return {
    props: { postsPagination },
    revalidate: 60 * 60 * 24, // 24 horas
  };
};
