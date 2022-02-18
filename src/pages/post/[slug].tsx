import { GetStaticPaths, GetStaticProps } from 'next';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { RichText } from 'prismic-dom';
import { Document } from '@prismicio/client/types/documents';

import { formatDateBlogHelper } from '../../utils/date';

import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: any[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

function handlePostResult(result: Document): unknown {
  const {
    first_publication_date,
    data: {
      title,
      subtitle,
      banner: { url },
      author,
      content,
    },
    ...rest
  } = result;

  return {
    ...rest,
    first_publication_date,
    data: {
      title: typeof title === 'string' ? title : RichText.asText(title),
      subtitle:
        typeof subtitle === 'string' ? subtitle : RichText.asText(subtitle),
      banner: { url },
      author: typeof author === 'string' ? author : RichText.asText(author),
      content: content.map(ctt => {
        return {
          heading:
            typeof ctt.heading === 'string'
              ? ctt.heading
              : RichText.asText(ctt.heading),
          body: ctt.body,
        };
      }),
    },
  };
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();
  const { isFallback } = router;
  const slug = router.query?.slug;

  function handleReadingTime(): string {
    const wordCount = post.data.content.reduce((acc1, content) => {
      return (
        acc1 +
        content.body.reduce((acc2, body) => {
          return acc2 + body.text.match(/\S+/g).length;
        }, 0)
      );
    }, 0);

    return `${wordCount <= 150 ? 1 : Math.round(wordCount / 150)} min`;
  }

  return isFallback ? (
    <div className={styles.fallback}>Carregando...</div>
  ) : (
    <>
      <Head>
        <title>spacetraveling | {post.data.title}</title>
      </Head>
      <Header />
      <main className={styles.container}>
        <img src={post.data.banner.url} alt="banner" />
        <article
          className={`${styles.post} ${commonStyles.container}`}
          key={slug as string}
        >
          <h1>{post.data.title}</h1>
          <div className={styles.postInfo}>
            <FiCalendar />{' '}
            <time>
              {formatDateBlogHelper(new Date(post.first_publication_date))}
            </time>
            <span>
              <FiUser /> {post.data.author}
            </span>
            <span>
              <FiClock /> {handleReadingTime()}
            </span>
          </div>
          {post.data.content.map(content => (
            <div key={content.heading}>
              <h2>{content.heading}</h2>
              {content.body.map((body, index) => (
                <div
                  key={`${content.heading}-${index}`} //eslint-disable-line
                  className={styles.postContent}
                  dangerouslySetInnerHTML={{ __html: body.text }} //eslint-disable-line
                />
              ))}
            </div>
          ))}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query('[at(document.type, "post")]', {
    pageSize: 1,
  });

  return {
    paths: postsResponse.results.map(post => ({
      params: {
        slug: post.uid,
      },
    })),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async context => {
  const {
    params: { slug },
  } = context;

  const prismic = getPrismicClient();
  const result = await prismic.getByUID('post', slug as string, {});

  const post = handlePostResult(result);

  return {
    props: {
      post,
    },
  };
};
